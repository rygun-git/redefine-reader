-- Create a function to get a sample of the Bible content
-- This function will return just the first part of the content to avoid timeouts
CREATE OR REPLACE FUNCTION get_bible_content_sample(version_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    content_sample text;
BEGIN
    -- Get just the first part of the content (first 100KB or so)
    SELECT LEFT(content, 100000) INTO content_sample
    FROM bible_versions
    WHERE id = version_id;
    
    RETURN content_sample;
END;
$$;
