export interface Message {
  id: string;
  content: string;
  role: 'patient' | 'therapist' | 'coach' | 'admin';
  session_id: string;
  timestamp: string;
  suds_before?: number;
  suds_after?: number;
  metadata?: any;
  tool_calls?: any[];
}