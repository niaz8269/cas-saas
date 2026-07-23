<?php

use App\Mail\VerifyStudentEmail;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

/*
 * Student self-signup email verification (ADR-0013): a signed link is emailed
 * on register; clicking it stamps email_verified_at. The signature is the auth
 * and the hash detects an email change since the link was issued.
 * registerPayload() lives in StudentRegisterTest.
 */

it('sends a verification email on registration and leaves the student unverified', function () {
    Mail::fake();

    $this->postJson('/api/v1/student/auth/register', registerPayload())
        ->assertCreated()
        ->assertJsonPath('student.email_verified', false);

    expect(Student::firstOrFail()->hasVerifiedEmail())->toBeFalse();
    Mail::assertSent(VerifyStudentEmail::class, fn ($mail) => $mail->hasTo('ali@example.com'));
});

it('verifies the email via the signed link', function () {
    $student = Student::factory()->create(['email_verified_at' => null]);

    $url = URL::temporarySignedRoute('student.verify', now()->addMinutes(60), [
        'id' => $student->id, 'hash' => sha1($student->email),
    ]);

    $this->get($url)->assertOk()->assertSee('Email verified', false);

    expect($student->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('rejects a verification link whose hash no longer matches the email', function () {
    $student = Student::factory()->create(['email_verified_at' => null]);

    // Validly signed, but for a different email hash (e.g. the address changed).
    $url = URL::temporarySignedRoute('student.verify', now()->addMinutes(60), [
        'id' => $student->id, 'hash' => sha1('someone-else@example.com'),
    ]);

    $this->get($url)->assertStatus(403);
    expect($student->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects an unsigned verification link', function () {
    $student = Student::factory()->create(['email_verified_at' => null]);

    $this->get("/api/v1/student/auth/verify/{$student->id}/".sha1($student->email))
        ->assertStatus(403);
});

it('resends the verification email to an unverified student', function () {
    Mail::fake();
    actingAsStudentPortal(['email_verified_at' => null]);

    $this->postJson('/api/v1/student/auth/verification/resend')->assertOk();

    Mail::assertSent(VerifyStudentEmail::class);
});

it('does not resend once the email is already verified', function () {
    Mail::fake();
    actingAsStudentPortal(['email_verified_at' => now()]);

    $this->postJson('/api/v1/student/auth/verification/resend')
        ->assertOk()->assertJsonPath('message', 'Your email is already verified.');

    Mail::assertNothingSent();
});
