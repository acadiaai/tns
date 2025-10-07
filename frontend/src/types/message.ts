export interface Message {
  id: string;
  content: string;
  role: 'patient' | 'therapist' | 'coach' | 'admin' | 'system';
  session_id: string;
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
  suds_before?: number;
  suds_after?: number;
  metadata?: any;
  tool_calls?: any[];
  message_type?: string;
}