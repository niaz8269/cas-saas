<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

/**
 * Creates (or resets) a real Super Admin without ever putting a password in
 * the shell history or the repo: the password is asked for, hidden.
 */
class CreateAdmin extends Command
{
    protected $signature = 'cas:create-admin {email : Login email} {name=Admin : Display name}';

    protected $description = 'Create a Super Admin account (asks for the password, hidden)';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        $password = (string) $this->secret('Password (at least 12 characters)');
        $confirm = (string) $this->secret('Repeat the password');

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            ['email' => ['required', 'email'], 'password' => ['required', 'string', 'min:12']],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        if ($password !== $confirm) {
            $this->error('The two passwords do not match.');

            return self::FAILURE;
        }

        $user = User::updateOrCreate(['email' => $email], [
            'name' => (string) $this->argument('name'),
            'password' => $password,
            'branch_id' => Branch::where('code', 'HQ')->value('id'),
            'status' => 'active',
        ]);

        Role::findOrCreate('Super Admin', 'staff');
        $user->syncRoles(['Super Admin']);

        $this->info("Super Admin ready: {$user->email}");

        return self::SUCCESS;
    }
}
