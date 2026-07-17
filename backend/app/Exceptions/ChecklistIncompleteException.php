<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when an application is submitted with required document types
 * missing. Rendered as 409 CHECKLIST_INCOMPLETE with the missing list.
 */
class ChecklistIncompleteException extends Exception
{
    /**
     * @param  list<string>  $missing
     */
    public function __construct(public readonly array $missing)
    {
        parent::__construct('Document checklist incomplete: '.implode(', ', $missing));
    }
}
