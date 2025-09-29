package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"cloud.google.com/go/storage"
	"therapy-navigation-system/internal/logger"
)

const (
	bucketName = "therapy-nav-db-backups"
	dbFileName = "therapy.db"
)

type BackupService struct {
	client   *storage.Client
	bucket   *storage.BucketHandle
	ctx      context.Context
	dbPath   string
	disabled bool
}

// NewBackupService creates a new backup service
func NewBackupService(dbPath string) (*BackupService, error) {
	ctx := context.Background()

	// In local development, disable Cloud Storage
	if os.Getenv("ENVIRONMENT") == "" || os.Getenv("ENVIRONMENT") == "dev" {
		logger.AppLogger.Info("Development mode: Cloud Storage backup disabled (using local SQLite)")
		return &BackupService{disabled: true, dbPath: dbPath}, nil
	}

	// Try to create Cloud Storage client
	client, err := storage.NewClient(ctx)
	if err != nil {
		logger.AppLogger.WithError(err).Warn("Failed to create Cloud Storage client, backups disabled")
		return &BackupService{disabled: true}, nil
	}

	bucket := client.Bucket(bucketName)

	// Create bucket if it doesn't exist (in case this is first run)
	if err := bucket.Create(ctx, os.Getenv("GOOGLE_CLOUD_PROJECT"), nil); err != nil {
		// Ignore error if bucket already exists
		logger.AppLogger.WithError(err).Debug("Bucket creation result (may already exist)")
	}

	logger.AppLogger.Info("Cloud Storage backup service initialized")
	return &BackupService{
		client: client,
		bucket: bucket,
		ctx:    ctx,
		dbPath: dbPath,
	}, nil
}

// RestoreFromBackup downloads the latest backup if local DB doesn't exist
func (bs *BackupService) RestoreFromBackup() error {
	if bs.disabled {
		return nil
	}

	// Check if local DB already exists
	if _, err := os.Stat(bs.dbPath); err == nil {
		logger.AppLogger.Info("Local database exists, skipping restore")
		return nil
	}

	logger.AppLogger.Info("Local database not found, attempting restore from Cloud Storage")

	// Download latest backup
	objectName := "therapy.db"
	obj := bs.bucket.Object(objectName)

	reader, err := obj.NewReader(bs.ctx)
	if err != nil {
		if err == storage.ErrObjectNotExist {
			logger.AppLogger.Info("No backup found in Cloud Storage, starting with fresh database")
			return nil
		}
		return fmt.Errorf("failed to open backup for reading: %w", err)
	}
	defer reader.Close()

	// Create local file
	file, err := os.Create(bs.dbPath)
	if err != nil {
		return fmt.Errorf("failed to create local database file: %w", err)
	}
	defer file.Close()

	// Copy data
	if _, err := io.Copy(file, reader); err != nil {
		return fmt.Errorf("failed to restore database: %w", err)
	}

	logger.AppLogger.Info("Database restored successfully from Cloud Storage backup")
	return nil
}

// BackupToStorage uploads the current database to Cloud Storage
func (bs *BackupService) BackupToStorage() error {
	if bs.disabled {
		return nil
	}

	// Check if database file exists
	if _, err := os.Stat(bs.dbPath); os.IsNotExist(err) {
		logger.AppLogger.Debug("Database file doesn't exist, skipping backup")
		return nil
	}

	logger.AppLogger.Debug("Backing up database to Cloud Storage")

	// Open local database file
	file, err := os.Open(bs.dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database file: %w", err)
	}
	defer file.Close()

	// Create object in Cloud Storage with timestamp
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	objectName := fmt.Sprintf("therapy.db")

	// Also create a timestamped backup for history
	timestampedName := fmt.Sprintf("backups/therapy_%s.db", timestamp)

	// Upload main backup
	if err := bs.uploadFile(file, objectName); err != nil {
		return fmt.Errorf("failed to upload main backup: %w", err)
	}

	// Reset file pointer for second upload
	if _, err := file.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to reset file pointer: %w", err)
	}

	// Upload timestamped backup
	if err := bs.uploadFile(file, timestampedName); err != nil {
		logger.AppLogger.WithError(err).Warn("Failed to upload timestamped backup")
	}

	logger.AppLogger.Debug("Database backup completed successfully")
	return nil
}

func (bs *BackupService) uploadFile(file *os.File, objectName string) error {
	obj := bs.bucket.Object(objectName)
	writer := obj.NewWriter(bs.ctx)
	writer.ContentType = "application/x-sqlite3"

	if _, err := io.Copy(writer, file); err != nil {
		writer.Close()
		return err
	}

	return writer.Close()
}

// StartPeriodicBackup starts a goroutine that backs up every 5 minutes
func (bs *BackupService) StartPeriodicBackup() {
	if bs.disabled {
		return
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			if err := bs.BackupToStorage(); err != nil {
				logger.AppLogger.WithError(err).Error("Periodic backup failed")
			}
		}
	}()

	logger.AppLogger.Info("Periodic database backup started (every 5 minutes)")
}

// Close cleans up the backup service
func (bs *BackupService) Close() error {
	if bs.disabled || bs.client == nil {
		return nil
	}

	// Final backup before closing
	if err := bs.BackupToStorage(); err != nil {
		logger.AppLogger.WithError(err).Error("Final backup failed")
	}

	return bs.client.Close()
}