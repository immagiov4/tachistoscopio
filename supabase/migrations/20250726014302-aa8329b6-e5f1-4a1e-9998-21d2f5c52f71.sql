-- Add exercise settings to word_lists table
ALTER TABLE public.word_lists 
ADD COLUMN settings jsonb DEFAULT '{
  "exposureDuration": 500,
  "intervalDuration": 200,
  "textCase": "original",
  "useMask": false,
  "maskDuration": 200
}'::jsonb;