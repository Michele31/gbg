export type AttendanceStatus = 'yes' | 'no' | 'late';

export interface WipeRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  wipe_date: string;
  wipe_time: string;
  server_name: string;
  notes: string | null;
  closed: number;
  created_by: string;
  created_at: string;
}

export interface AttendanceRow {
  id: number;
  wipe_id: number;
  user_id: string;
  username: string;
  status: AttendanceStatus;
  vip: number | null;
  updated_at: string;
}
