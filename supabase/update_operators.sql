-- Step 1: Delete existing placeholder operators
DELETE FROM public.masters 
WHERE category IN ('operator', 'operators', 'installer', 'installers');

-- Step 2: Insert the new correct list of operators
INSERT INTO public.masters (category, name)
VALUES 
  ('operator', 'Himanshu Atrey'),
  ('operator', 'Danish'),
  ('operator', 'Narinder'),
  ('operator', 'MD Firoz'),
  ('operator', 'Akhtar Ali'),
  ('operator', 'Jawed'),
  ('operator', 'Warish'),
  ('operator', 'Rakesh'),
  ('operator', 'Suraj'),
  ('operator', 'Rohit'),
  ('operator', 'Shivam'),
  ('operator', 'Jaskaran Singh'),
  ('operator', 'Tanmay Patinge'),
  ('operator', 'Varij Sharma');
