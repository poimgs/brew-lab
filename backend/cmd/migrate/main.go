package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"coffee-tracker/internal/database"

	"github.com/golang-migrate/migrate/v4"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	var (
		command = flag.String("cmd", "up", "Migration command: up, down, version, force")
		version = flag.Int("version", 0, "Version to force (used with -cmd=force)")
	)
	flag.Parse()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := database.Connect(databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	switch *command {
	case "up":
		if err := database.RunMigrations(db); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
	case "down":
		if err := database.MigrateDown(db); err != nil {
			log.Fatalf("rollback failed: %v", err)
		}
	case "version":
		v, dirty, err := database.MigrateVersion(db)
		if err != nil {
			if err == migrate.ErrNilVersion {
				fmt.Println("No migrations applied yet")
				return
			}
			log.Fatalf("failed to get version: %v", err)
		}
		fmt.Printf("Version: %d, Dirty: %v\n", v, dirty)
	case "force":
		if *version == 0 {
			log.Fatal("-version flag is required for force command")
		}
		if err := database.MigrateForce(db, *version); err != nil {
			log.Fatalf("force failed: %v", err)
		}
	default:
		log.Fatalf("unknown command: %s", *command)
	}
}
