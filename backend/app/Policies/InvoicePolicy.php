<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('finance.view.global');
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $user->can('finance.view.global');
    }

    public function manage(User $user, ?Invoice $invoice = null): bool
    {
        return $user->can('finance.manage.global');
    }
}
