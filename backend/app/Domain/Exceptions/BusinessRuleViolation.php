<?php

namespace App\Domain\Exceptions;

use DomainException;
use Illuminate\Http\JsonResponse;

/**
 * A request that is well-formed but breaks a business rule (empty cart, no stock,
 * order not payable). Rendered as 422 with a stable machine-readable code.
 */
class BusinessRuleViolation extends DomainException
{
    public function __construct(
        public readonly string $reason,
        string $message,
        public readonly array $details = [],
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->reason,
            'details' => (object) $this->details,
        ], 422);
    }
}
