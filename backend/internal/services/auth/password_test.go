package auth

import (
	"testing"
)

func TestPasswordService_Hash(t *testing.T) {
	svc := NewPasswordService(4) // Use low cost for faster tests

	hash, err := svc.Hash("Test123!")
	if err != nil {
		t.Fatalf("Hash() error = %v", err)
	}

	if hash == "" {
		t.Error("Hash() returned empty string")
	}

	if hash == "Test123!" {
		t.Error("Hash() returned plaintext password")
	}
}

func TestPasswordService_Verify(t *testing.T) {
	svc := NewPasswordService(4)

	password := "Test123!"
	hash, err := svc.Hash(password)
	if err != nil {
		t.Fatalf("Hash() error = %v", err)
	}

	tests := []struct {
		name     string
		password string
		wantErr  error
	}{
		{
			name:     "correct password",
			password: password,
			wantErr:  nil,
		},
		{
			name:     "wrong password",
			password: "WrongPass1!",
			wantErr:  ErrInvalidCredentials,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  ErrInvalidCredentials,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := svc.Verify(tt.password, hash)
			if err != tt.wantErr {
				t.Errorf("Verify() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestPasswordService_Validate(t *testing.T) {
	svc := NewPasswordService(4)

	tests := []struct {
		name     string
		password string
		wantErr  error
	}{
		{
			name:     "valid password",
			password: "Test123!",
			wantErr:  nil,
		},
		{
			name:     "too short",
			password: "Te1!",
			wantErr:  ErrPasswordTooShort,
		},
		{
			name:     "no uppercase",
			password: "test123!",
			wantErr:  ErrPasswordNoUpper,
		},
		{
			name:     "no lowercase",
			password: "TEST123!",
			wantErr:  ErrPasswordNoLower,
		},
		{
			name:     "no digit",
			password: "TestTest!",
			wantErr:  ErrPasswordNoDigit,
		},
		{
			name:     "no special",
			password: "Test1234",
			wantErr:  ErrPasswordNoSpecial,
		},
		{
			name:     "all requirements met",
			password: "MyP@ssw0rd!",
			wantErr:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := svc.Validate(tt.password)
			if err != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
