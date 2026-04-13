-- Merge 'request_to_join' into 'public_with_approval' — they were functionally identical.
-- Convert any existing pods, then the enum value becomes unused.
-- PostgreSQL does not support DROP VALUE from enums, so the old value stays in the type
-- but is never used by any code path.

UPDATE pods SET visibility = 'public_with_approval' WHERE visibility = 'request_to_join';
