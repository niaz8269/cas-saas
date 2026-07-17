<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use App\Services\Auth\ScopeResolver;
use Illuminate\Support\Facades\Gate;

/**
 * Document access = documents.* permission scope AND visibility of the
 * parent record (application/student) via its own policy. Sensitive
 * types additionally require global scope or direct assignment.
 */
class DocumentPolicy
{
    public function __construct(private readonly ScopeResolver $scopes) {}

    public function viewAny(User $user): bool
    {
        return $this->scopes->resolve($user, 'documents', 'view') !== null;
    }

    public function view(User $user, Document $document): bool
    {
        $scope = $this->scopes->resolve($user, 'documents', 'view');

        if ($scope === null || ! $this->canSeeParent($user, $document)) {
            return false;
        }

        // Sensitive types (passport, financials): never exposed through
        // broad branch/department visibility — only global or assigned.
        if ($document->type?->is_sensitive && in_array($scope, ['branch', 'department'], true)) {
            return false;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $this->scopes->resolve($user, 'documents', 'upload') !== null;
    }

    public function verify(User $user, Document $document): bool
    {
        return $user->can('documents.verify.global');
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->can('documents.delete.global');
    }

    private function canSeeParent(User $user, Document $document): bool
    {
        $parent = $document->documentable;

        return $parent !== null && Gate::forUser($user)->allows('view', $parent);
    }
}
