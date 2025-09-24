package logger

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm/logger"
)

var AppLogger *logrus.Logger

func InitLogger() error {
	AppLogger = logrus.New()

	// Use text formatter for console with colors
	AppLogger.SetFormatter(&logrus.TextFormatter{
		ForceColors:     true,
		FullTimestamp:   true,
		TimestampFormat: "15:04:05.000",
		DisableQuote:    true,
	})

	// Set log level from env or default to Info
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}
	
	level, err := logrus.ParseLevel(logLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	AppLogger.SetLevel(level)

	// Ensure logs directory exists
	if err := os.MkdirAll("logs", 0755); err != nil {
		return err
	}

	// Open backend log file with JSON formatter
	backendLogPath := filepath.Join("logs", "backend.json")
	file, err := os.OpenFile(backendLogPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0666)
	if err != nil {
		return err
	}

	// Create a file logger with JSON format
	fileLogger := logrus.New()
	fileLogger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
		},
	})
	fileLogger.SetOutput(file)
	fileLogger.SetLevel(level)

	// Write to both console and file
	multiWriter := io.MultiWriter(os.Stdout, file)
	AppLogger.SetOutput(multiWriter)

	// Log initialization with structured fields
	AppLogger.WithFields(logrus.Fields{
		"component": "logger",
		"action":    "initialize",
		"format":    "json",
		"output":    backendLogPath,
	}).Info("Backend logger initialized")

	return nil
}

// Custom GORM logger for JSON output
type GormLogger struct {
	logger *logrus.Logger
}

func NewGormLogger() logger.Interface {
	// Create separate logger for SQLite with JSON format
	sqliteLogger := logrus.New()
	sqliteLogger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
		},
	})

	// Open SQLite log file
	sqliteLogPath := filepath.Join("logs", "sqlite.json")
	file, err := os.OpenFile(sqliteLogPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0666)
	if err != nil {
		sqliteLogger.SetOutput(os.Stdout)
	} else {
		sqliteLogger.SetOutput(file)
	}

	sqliteLogger.SetLevel(logrus.InfoLevel)

	return &GormLogger{logger: sqliteLogger}
}

func (l *GormLogger) LogMode(level logger.LogLevel) logger.Interface {
	return l
}

func (l *GormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.logger.WithFields(logrus.Fields{
		"component": "database",
		"level":     "info",
	}).Infof(msg, data...)
}

func (l *GormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.logger.WithFields(logrus.Fields{
		"component": "database",
		"level":     "warn",
	}).Warnf(msg, data...)
}

func (l *GormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.logger.WithFields(logrus.Fields{
		"component": "database",
		"level":     "error",
	}).Errorf(msg, data...)
}

func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	sql, rows := fc()
	elapsed := time.Since(begin)

	l.logger.WithFields(logrus.Fields{
		"component": "database",
		"sql":       sql,
		"rows":      rows,
		"elapsed":   elapsed.String(),
		"error":     err,
	}).Info("Database query executed")
} 