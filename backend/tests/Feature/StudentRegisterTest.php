<?php

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function registerPayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Ali',
        'last_name' => 'Raza',
        'email' => 'ali@example.com',
        'phone' => '+92 300 1234567',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ], $overrides);
}

it('registers a new student, activates the account and returns a token', function () {
    $this->postJson('/api/v1/student/auth/register', registerPayload())
        ->assertCreated()
        ->assertJsonStructure(['token', 'token_type', 'student' => ['id', 'student_code', 'first_name', 'last_name', 'email']])
        ->assertJsonPath('student.email', 'ali@example.com');

    $student = Student::firstOrFail();
    expect($student->status)->toBe('active')
        ->and($student->student_code)->toStartWith('STU-')
        ->and($student->last_login_at)->not->toBeNull()
        ->and(Hash::check('secret1234', $student->password))->toBeTrue()
        ->and($student->tokens()->count())->toBe(1);
});

it('lets the newly registered student sign in', function () {
    $this->postJson('/api/v1/student/auth/register', registerPayload())->assertCreated();

    $this->postJson('/api/v1/student/auth/login', [
        'email' => 'ali@example.com',
        'password' => 'secret1234',
    ])->assertOk()->assertJsonStructure(['token', 'student']);
});

it('rejects an email that already belongs to a student', function () {
    Student::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/student/auth/register', registerPayload(['email' => 'taken@example.com']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');

    expect(Student::where('email', 'taken@example.com')->count())->toBe(1);
});

it('requires a confirmed password of at least 8 characters', function () {
    $this->postJson('/api/v1/student/auth/register', registerPayload(['password' => 'short', 'password_confirmation' => 'short']))
        ->assertStatus(422)->assertJsonValidationErrors('password');

    $this->postJson('/api/v1/student/auth/register', registerPayload(['password_confirmation' => 'different1234']))
        ->assertStatus(422)->assertJsonValidationErrors('password');

    expect(Student::count())->toBe(0);
});

it('requires first name, last name, phone and a valid email', function () {
    $this->postJson('/api/v1/student/auth/register', [
        'email' => 'not-an-email',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['first_name', 'last_name', 'phone', 'email']);
});
