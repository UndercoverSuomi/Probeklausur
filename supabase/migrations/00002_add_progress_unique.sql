-- Add unique constraint needed for upsert on processing_progress
ALTER TABLE processing_progress
ADD CONSTRAINT processing_progress_entity_step_unique
UNIQUE (entity_type, entity_id, step_name);
