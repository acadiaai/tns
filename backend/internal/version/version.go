package version

import "time"

// BuildTime gets set at compile time
var BuildTime = "unknown"

// GetVersion returns current build information
func GetVersion() map[string]string {
	if BuildTime == "unknown" {
		BuildTime = time.Now().Format("2006-01-02_15:04:05")
	}
	
	return map[string]string{
		"build_time": BuildTime,
		"status": "development",
	}
}