package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/vertexai/genai"
)

type FileMetadata struct {
	Path            string    `json:"path"`
	Lines           int       `json:"lines"`
	Bytes           int64     `json:"bytes"`
	Language        string    `json:"language"`
	Purpose         string    `json:"purpose"`
	QualityScore    int       `json:"quality_score"`
	Issues          []string  `json:"issues"`
	Dependencies    []string  `json:"dependencies"`
	LastModified    time.Time `json:"last_modified"`
	BullshitLevel   string    `json:"bullshit_level"`
	HasTodos        bool      `json:"has_todos"`
	HasDeadCode     bool      `json:"has_dead_code"`
	SecurityIssues  []string  `json:"security_concerns"`
	ShouldDelete    bool      `json:"should_delete"`
	RefactorPriority string   `json:"refactor_priority"`
	Category        string    `json:"category"`
}

type CodeInventory struct {
	Timestamp   time.Time        `json:"timestamp"`
	TotalFiles  int              `json:"total_files"`
	TotalLines  int              `json:"total_lines"`
	TotalBytes  int64            `json:"total_bytes"`
	Files       []FileMetadata   `json:"files"`
	Categories  map[string]Stats `json:"categories"`
}

type Stats struct {
	Files int   `json:"files"`
	Lines int   `json:"lines"`
	Bytes int64 `json:"bytes"`
}

type GeminiAnalysis struct {
	Purpose          string   `json:"purpose"`
	Quality          int      `json:"quality"`
	HasTodos         bool     `json:"has_todos"`
	HasDeadCode      bool     `json:"has_dead_code"`
	SecurityConcerns []string `json:"security_concerns"`
	ShouldDelete     bool     `json:"should_delete"`
	RefactorPriority string   `json:"refactor_priority"`
	Dependencies     []string `json:"dependencies"`
	Issues           []string `json:"issues"`
}

func main() {
	fmt.Println("🔍 Code Inventory Analyzer")
	fmt.Println("==========================")

	// Initialize Gemini client using Vertex AI
	ctx := context.Background()
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = "therapy-nav-poc-quan" // Default project
	}

	var client *genai.Client
	clientErr := fmt.Errorf("skipping AI analysis")

	// Try to initialize Vertex AI client
	if projectID != "" {
		client, clientErr = genai.NewClient(ctx, projectID, "us-central1")
		if clientErr != nil {
			log.Printf("Warning: Gemini client initialization failed: %v", clientErr)
			log.Println("Continuing without AI analysis...")
			client = nil
		}
	}

	defer func() {
		if client != nil {
			client.Close()
		}
	}()

	inventory := &CodeInventory{
		Timestamp:  time.Now(),
		Files:      []FileMetadata{},
		Categories: make(map[string]Stats),
	}

	// Find all code files using fd
	fmt.Println("\n📁 Finding all code files...")
	files, err := findCodeFiles()
	if err != nil {
		log.Fatalf("Failed to find files: %v", err)
	}

	fmt.Printf("Found %d files to analyze\n\n", len(files))

	// Analyze each file
	for i, file := range files {
		fmt.Printf("[%d/%d] Analyzing: %s\n", i+1, len(files), file)

		metadata, err := analyzeFile(file, client, ctx)
		if err != nil {
			log.Printf("  ⚠️  Error analyzing %s: %v", file, err)
			continue
		}

		inventory.Files = append(inventory.Files, metadata)
		inventory.TotalFiles++
		inventory.TotalLines += metadata.Lines
		inventory.TotalBytes += metadata.Bytes

		// Update category stats
		stats := inventory.Categories[metadata.Category]
		stats.Files++
		stats.Lines += metadata.Lines
		stats.Bytes += metadata.Bytes
		inventory.Categories[metadata.Category] = stats
	}

	// Save inventory to JSON
	fmt.Println("\n💾 Saving code-inventory.json...")
	if err := saveInventory(inventory); err != nil {
		log.Fatalf("Failed to save inventory: %v", err)
	}

	// Generate HTML visualization
	fmt.Println("🎨 Generating HTML visualization...")
	if err := generateVisualization(inventory); err != nil {
		log.Fatalf("Failed to generate visualization: %v", err)
	}

	// Print summary
	fmt.Println("\n📊 Summary")
	fmt.Println("==========")
	fmt.Printf("Total Files: %d\n", inventory.TotalFiles)
	fmt.Printf("Total Lines: %d\n", inventory.TotalLines)
	fmt.Printf("Total Size: %.2f MB\n", float64(inventory.TotalBytes)/1024/1024)
	fmt.Println("\nBy Category:")
	for cat, stats := range inventory.Categories {
		fmt.Printf("  %s: %d files, %d lines\n", cat, stats.Files, stats.Lines)
	}

	fmt.Println("\n✅ Complete! Open code-inventory.html in your browser")
}

func findCodeFiles() ([]string, error) {
	cmd := exec.Command("fd",
		"-t", "f",
		"-e", "go", "-e", "ts", "-e", "tsx", "-e", "js", "-e", "jsx",
		"-e", "css", "-e", "json", "-e", "md", "-e", "yaml", "-e", "yml",
		"-E", "node_modules", "-E", ".git", "-E", "*.min.js", "-E", "dist",
		".", ".")

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var files []string
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		file := scanner.Text()
		if file != "" {
			files = append(files, file)
		}
	}

	return files, scanner.Err()
}

func analyzeFile(path string, client *genai.Client, ctx context.Context) (FileMetadata, error) {
	metadata := FileMetadata{
		Path:     path,
		Category: categorizeFile(path),
		Language: getLanguage(path),
	}

	// Get file info
	info, err := os.Stat(path)
	if err != nil {
		return metadata, err
	}
	metadata.Bytes = info.Size()
	metadata.LastModified = info.ModTime()

	// Count lines
	lines, err := countLines(path)
	if err != nil {
		return metadata, err
	}
	metadata.Lines = lines

	// Skip Gemini analysis for large or generated files
	if shouldSkipAIAnalysis(path, lines) {
		metadata.Purpose = "Auto-generated or vendor file"
		metadata.QualityScore = 5
		metadata.BullshitLevel = "low"
		metadata.RefactorPriority = "low"
		return metadata, nil
	}

	// Use Gemini for intelligent analysis (if available)
	if client != nil {
		analysis, err := analyzeWithGemini(client, ctx, path)
		if err == nil {
			metadata.Purpose = analysis.Purpose
			metadata.QualityScore = analysis.Quality
			metadata.HasTodos = analysis.HasTodos
			metadata.HasDeadCode = analysis.HasDeadCode
			metadata.SecurityIssues = analysis.SecurityConcerns
			metadata.ShouldDelete = analysis.ShouldDelete
			metadata.RefactorPriority = analysis.RefactorPriority
			metadata.Dependencies = analysis.Dependencies
			metadata.Issues = analysis.Issues

			// Calculate bullshit level
			if analysis.ShouldDelete {
				metadata.BullshitLevel = "critical"
			} else if analysis.HasDeadCode || len(analysis.Issues) > 3 {
				metadata.BullshitLevel = "high"
			} else if analysis.HasTodos || len(analysis.Issues) > 0 {
				metadata.BullshitLevel = "medium"
			} else {
				metadata.BullshitLevel = "low"
			}
		}
	}

	// Fallback analysis if Gemini is not available
	if metadata.Purpose == "" {
		metadata.Purpose = fmt.Sprintf("%s file (%d lines)", metadata.Language, lines)
		metadata.QualityScore = 5
		metadata.BullshitLevel = "unknown"
		metadata.RefactorPriority = "medium"
	}

	return metadata, nil
}

func analyzeWithGemini(client *genai.Client, ctx context.Context, path string) (*GeminiAnalysis, error) {
	// Read file content (limit to first 500 lines for API efficiency)
	content, err := readFileContent(path, 500)
	if err != nil {
		return nil, err
	}

	prompt := fmt.Sprintf(`Analyze this code file and return ONLY valid JSON:
File: %s

%s

Return JSON in this exact format:
{
  "purpose": "one line description of what this file does",
  "quality": 7,
  "has_todos": false,
  "has_dead_code": false,
  "security_concerns": [],
  "should_delete": false,
  "refactor_priority": "low",
  "dependencies": ["list", "of", "imports"],
  "issues": ["list of issues found"]
}`, path, content)

	model := client.GenerativeModel("gemini-1.5-flash")
	model.SetTemperature(0.1)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))

	if err != nil {
		return nil, err
	}

	if resp == nil || len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	// Extract text from response
	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if text, ok := part.(genai.Text); ok {
			responseText = string(text)
			break
		}
	}

	// Parse JSON response
	var analysis GeminiAnalysis
	if err := json.Unmarshal([]byte(responseText), &analysis); err != nil {
		// Try to extract JSON from markdown code block
		if start := strings.Index(responseText, "{"); start != -1 {
			if end := strings.LastIndex(responseText, "}"); end != -1 {
				jsonStr := responseText[start : end+1]
				if err := json.Unmarshal([]byte(jsonStr), &analysis); err != nil {
					return nil, fmt.Errorf("failed to parse Gemini response: %v", err)
				}
			}
		} else {
			return nil, fmt.Errorf("failed to parse Gemini response: %v", err)
		}
	}

	return &analysis, nil
}

func readFileContent(path string, maxLines int) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() && len(lines) < maxLines {
		lines = append(lines, scanner.Text())
	}

	return strings.Join(lines, "\n"), scanner.Err()
}

func countLines(path string) (int, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	count := 0
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		count++
	}

	return count, scanner.Err()
}

func categorizeFile(path string) string {
	switch {
	case strings.Contains(path, "/backend/") || strings.HasSuffix(path, ".go"):
		return "Backend"
	case strings.Contains(path, "/frontend/") || strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".ts"):
		return "Frontend"
	case strings.HasSuffix(path, ".md"):
		return "Documentation"
	case strings.HasSuffix(path, ".json") || strings.HasSuffix(path, ".yaml") || strings.HasSuffix(path, ".yml"):
		return "Configuration"
	case strings.HasSuffix(path, ".css"):
		return "Styles"
	default:
		return "Other"
	}
}

func getLanguage(path string) string {
	ext := filepath.Ext(path)
	switch ext {
	case ".go":
		return "Go"
	case ".ts", ".tsx":
		return "TypeScript"
	case ".js", ".jsx":
		return "JavaScript"
	case ".css":
		return "CSS"
	case ".json":
		return "JSON"
	case ".md":
		return "Markdown"
	case ".yaml", ".yml":
		return "YAML"
	default:
		return "Unknown"
	}
}

func shouldSkipAIAnalysis(path string, lines int) bool {
	// Skip very large files
	if lines > 1000 {
		return true
	}

	// Skip generated files
	if strings.Contains(path, "generated") ||
	   strings.Contains(path, ".min.") ||
	   strings.Contains(path, "vendor/") ||
	   strings.HasSuffix(path, ".lock") {
		return true
	}

	return false
}

func saveInventory(inventory *CodeInventory) error {
	data, err := json.MarshalIndent(inventory, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("code-inventory.json", data, 0644)
}

func generateVisualization(inventory *CodeInventory) error {
	html := `<!DOCTYPE html>
<html>
<head>
    <title>Code Inventory - Therapy Navigation System</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0a0a0a;
            color: #ffffff;
        }
        h1 {
            margin: 0 0 20px 0;
            font-size: 24px;
            color: #ffffff;
        }
        #chart {
            width: 100%;
            height: calc(100vh - 200px);
            border: 1px solid #333;
            border-radius: 8px;
            overflow: hidden;
            background: #111;
        }
        .node {
            cursor: pointer;
            stroke: #000;
            stroke-width: 0.5px;
        }
        .label {
            font-size: 11px;
            fill: white;
            pointer-events: none;
            text-shadow: 0 0 3px rgba(0,0,0,0.8);
        }
        #tooltip {
            position: absolute;
            padding: 12px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #444;
            border-radius: 4px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            font-size: 12px;
            max-width: 400px;
        }
        #stats {
            display: flex;
            gap: 30px;
            margin-bottom: 20px;
            padding: 15px;
            background: #1a1a1a;
            border-radius: 8px;
        }
        .stat {
            display: flex;
            flex-direction: column;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #4a9eff;
        }
        .stat-label {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
        }
        .legend {
            display: flex;
            gap: 20px;
            margin-top: 20px;
            font-size: 12px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <h1>🗂️ Code Inventory Analysis</h1>

    <div id="stats">
        <div class="stat">
            <span class="stat-value">` + fmt.Sprintf("%d", inventory.TotalFiles) + `</span>
            <span class="stat-label">Total Files</span>
        </div>
        <div class="stat">
            <span class="stat-value">` + fmt.Sprintf("%d", inventory.TotalLines) + `</span>
            <span class="stat-label">Lines of Code</span>
        </div>
        <div class="stat">
            <span class="stat-value">` + fmt.Sprintf("%.1f", float64(inventory.TotalBytes)/1024/1024) + ` MB</span>
            <span class="stat-label">Total Size</span>
        </div>
    </div>

    <div id="chart"></div>
    <div id="tooltip"></div>

    <div class="legend">
        <div class="legend-item">
            <div class="legend-color" style="background: #2ecc71"></div>
            <span>Clean (low bullshit)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #f39c12"></div>
            <span>Needs Review (medium)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #e74c3c"></div>
            <span>Needs Cleanup (high)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #c0392b"></div>
            <span>Critical (should delete?)</span>
        </div>
    </div>

    <script>
        const data = ` + string(mustMarshalJSON(inventory)) + `;

        // Transform data for treemap
        const hierarchyData = {
            name: "root",
            children: Object.entries(
                data.files.reduce((acc, file) => {
                    if (!acc[file.category]) {
                        acc[file.category] = {
                            name: file.category,
                            children: []
                        };
                    }
                    acc[file.category].children.push({
                        name: file.path.split('/').pop(),
                        path: file.path,
                        value: file.lines,
                        bullshit: file.bullshit_level,
                        purpose: file.purpose,
                        quality: file.quality_score,
                        issues: file.issues || [],
                        security: file.security_concerns || [],
                        refactor: file.refactor_priority,
                        shouldDelete: file.should_delete
                    });
                    return acc;
                }, {})
            ).map(([_, v]) => v)
        };

        // Color scale based on bullshit level
        const colorScale = {
            'low': '#2ecc71',
            'medium': '#f39c12',
            'high': '#e74c3c',
            'critical': '#c0392b',
            'unknown': '#7f8c8d'
        };

        // Set dimensions
        const width = document.getElementById('chart').clientWidth;
        const height = document.getElementById('chart').clientHeight;

        // Create treemap layout
        const treemap = d3.treemap()
            .size([width, height])
            .padding(2)
            .round(true);

        // Create hierarchy
        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        treemap(root);

        // Create SVG
        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Create tooltip
        const tooltip = d3.select('#tooltip');

        // Draw nodes
        const node = svg.selectAll('g')
            .data(root.leaves())
            .enter().append('g')
            .attr('transform', d => 'translate(' + d.x0 + ',' + d.y0 + ')');

        // Add rectangles
        node.append('rect')
            .attr('class', 'node')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => colorScale[d.data.bullshit] || '#7f8c8d')
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                tooltip.transition().duration(200).style('opacity', .9);

                let issuesHtml = d.data.issues.length > 0
                    ? '<br>Issues: ' + d.data.issues.join(', ')
                    : '';
                let securityHtml = d.data.security.length > 0
                    ? '<br>🔒 Security: ' + d.data.security.join(', ')
                    : '';
                let deleteHtml = d.data.shouldDelete
                    ? '<br>⚠️ <b>Consider deleting this file</b>'
                    : '';

                tooltip.html(
                    '<b>' + d.data.path + '</b><br>' +
                    'Purpose: ' + d.data.purpose + '<br>' +
                    'Lines: ' + d.data.value + '<br>' +
                    'Quality: ' + d.data.quality + '/10<br>' +
                    'Refactor Priority: ' + d.data.refactor +
                    issuesHtml + securityHtml + deleteHtml
                )
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                tooltip.transition().duration(500).style('opacity', 0);
            });

        // Add labels for larger nodes
        node.append('text')
            .attr('class', 'label')
            .attr('x', 4)
            .attr('y', 14)
            .text(d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                if (width > 50 && height > 20) {
                    return d.data.name;
                }
                return '';
            });
    </script>
</body>
</html>`

	return os.WriteFile("code-inventory.html", []byte(html), 0644)
}

func mustMarshalJSON(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return data
}