<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

/**
 * Records immutable audit entries on create/update/delete (CLAUDE.md
 * compliance). Sensitive attributes are never captured. The actor is the
 * authenticated staff user (portal/console actions record no user).
 *
 * A model may declare `protected array $auditExclude = [...]` to omit
 * extra fields from the before/after snapshots.
 */
trait Auditable
{
    /** Never write these to old/new_values. */
    private const NEVER_AUDIT = ['password', 'two_fa_secret', 'remember_token'];

    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            $model->writeAuditLog('create', null, $model->auditSnapshot($model->getAttributes()));
        });

        static::updated(function (Model $model) {
            $changes = Arr::except($model->getChanges(), ['updated_at']);

            if ($changes === []) {
                return;
            }

            $model->writeAuditLog(
                'update',
                $model->auditSnapshot(Arr::only($model->getRawOriginal(), array_keys($changes))),
                $model->auditSnapshot($changes),
            );
        });

        static::deleted(function (Model $model) {
            $model->writeAuditLog('delete', $model->auditSnapshot($model->getAttributes()), null);
        });
    }

    /**
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>|null  $new
     */
    public function writeAuditLog(string $action, ?array $old, ?array $new): void
    {
        AuditLog::create([
            'user_id' => self::auditActorId(),
            'action' => $action,
            'auditable_type' => static::class,
            'auditable_id' => $this->getKey(),
            'old_values' => $old,
            'new_values' => $new,
            'ip' => request()?->ip(),
            'user_agent' => mb_substr((string) request()?->userAgent(), 0, 255) ?: null,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    protected function auditSnapshot(array $attributes): array
    {
        $exclude = array_merge(self::NEVER_AUDIT, $this->auditExclude ?? []);

        return Arr::except($attributes, $exclude);
    }

    /** Only real staff users map to audit_logs.user_id. */
    private static function auditActorId(): ?int
    {
        foreach (['staff', 'web'] as $guard) {
            if (($id = auth()->guard($guard)->id()) !== null) {
                return (int) $id;
            }
        }

        return null;
    }
}
