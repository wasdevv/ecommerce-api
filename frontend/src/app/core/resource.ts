import { Resource } from '@angular/core';

/** `resource.value()` throws while the resource is in an error state; this reads it safely. */
export const valueOf = <T>(res: Resource<T>): T | undefined => (res.hasValue() ? res.value() : undefined);
