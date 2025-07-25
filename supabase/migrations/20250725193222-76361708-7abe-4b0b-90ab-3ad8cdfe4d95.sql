-- Create user role enum
CREATE TYPE user_role AS ENUM ('therapist', 'patient');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create word lists table
CREATE TABLE public.word_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  words TEXT[] NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table (for scheduled exercises)
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id),
  word_list_id UUID NOT NULL REFERENCES public.word_lists(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, day_of_week)
);

-- Create exercise sessions table (for tracking completed sessions)
CREATE TABLE public.exercise_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  total_words INTEGER NOT NULL,
  correct_words INTEGER NOT NULL,
  incorrect_words INTEGER NOT NULL,
  accuracy DECIMAL NOT NULL,
  duration INTEGER NOT NULL, -- milliseconds
  missed_words TEXT[],
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Therapists can view their patients" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'patient' AND 
  created_by IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'therapist'
  )
);

CREATE POLICY "Therapists can create patients" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  role = 'patient' AND 
  created_by IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'therapist'
  )
);

-- RLS Policies for word_lists
CREATE POLICY "Therapists can manage their word lists" 
ON public.word_lists 
FOR ALL 
USING (
  created_by IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'therapist'
  )
);

CREATE POLICY "Patients can view word lists from their therapists" 
ON public.word_lists 
FOR SELECT 
USING (
  created_by IN (
    SELECT created_by FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'patient'
  )
);

-- RLS Policies for exercises
CREATE POLICY "Therapists can manage exercises for their patients" 
ON public.exercises 
FOR ALL 
USING (
  therapist_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'therapist'
  )
);

CREATE POLICY "Patients can view their own exercises" 
ON public.exercises 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'patient'
  )
);

-- RLS Policies for exercise_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.exercise_sessions 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Patients can create their own sessions" 
ON public.exercise_sessions 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'patient'
  )
);

CREATE POLICY "Therapists can view sessions of their patients" 
ON public.exercise_sessions 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.profiles 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'therapist'
    )
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_word_lists_updated_at
  BEFORE UPDATE ON public.word_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();