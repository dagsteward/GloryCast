// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken:  string
  refreshToken: string
  expiresIn:    number
}

export interface UserProfile {
  id:          string
  email:       string
  displayName: string | null
  avatarUrl:   string | null
  locale:      string
  timezone:    string
  lastLoginAt: string | null
}

export type Role =
  | 'VIEWER'
  | 'CAMERA_OPERATOR'
  | 'LYRICS_OPERATOR'
  | 'BIBLE_OPERATOR'
  | 'PRODUCER'
  | 'CHURCH_ADMIN'
  | 'SUPER_ADMIN'

// ── Church ────────────────────────────────────────────────────────────────────

export interface Church {
  id:              string
  name:            string
  slug:            string
  logoUrl:         string | null
  location:        string | null
  contactEmail:    string | null
  website:         string | null
  timezone:        string
  defaultLanguage: string
  createdAt:       string
}

// ── Stream ────────────────────────────────────────────────────────────────────

export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'ARCHIVED'

export interface Stream {
  id:            string
  churchId:      string
  title:         string
  streamKey:     string
  rtmpIngestUrl: string
  status:        StreamStatus
  startedAt:     string | null
  endedAt:       string | null
  durationSecs:  number | null
  viewerCount:   number
  destinations:  StreamDestination[]
}

export interface StreamDestination {
  platform: 'youtube' | 'facebook' | 'custom'
  rtmpUrl:  string
  label:    string
}

// ── Scripture Detection ───────────────────────────────────────────────────────

export interface DetectedScripture {
  raw:        string
  book:       string
  bookId:     number
  chapter:    number
  verse?:     number
  verseEnd?:  number
  testament:  'OT' | 'NT'
  reference:  string
  confidence: number
  posStart:   number
  posEnd:     number
}

// ── Sermon ────────────────────────────────────────────────────────────────────

export interface SermonSummary {
  title:      string
  summary:    string
  keyPoints:  string[]
  scriptures: string[]
  devotional: string
  prayer:     string
  socialPost: string
}

// ── Webinar ───────────────────────────────────────────────────────────────────

export type WebinarStatus = 'SCHEDULED' | 'LIVE' | 'ENDED'

export interface Webinar {
  id:              string
  churchId:        string
  title:           string
  description:     string | null
  scheduledAt:     string
  durationMinutes: number
  maxAttendees:    number
  isPublic:        boolean
  status:          WebinarStatus
  meetingId:       string
  joinUrl:         string
  platform:        string
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id:            string
  question:      string
  options:       { text: string; isCorrect: boolean }[]
  explanation:   string
  points:        number
  timeLimitSecs: number
}

export interface Quiz {
  id:        string
  churchId:  string
  streamId:  string | null
  title:     string
  status:    'DRAFT' | 'ACTIVE' | 'CLOSED'
  questions: QuizQuestion[]
}

// ── Poll ──────────────────────────────────────────────────────────────────────

export interface PollOption {
  id:    number
  text:  string
  votes: number
}

export interface Poll {
  id:            string
  churchId:      string
  question:      string
  options:       PollOption[]
  allowMultiple: boolean
  status:        'PENDING' | 'ACTIVE' | 'CLOSED'
}

// ── Stage Display ─────────────────────────────────────────────────────────────

export type StageContentType = 'SCRIPTURE' | 'LYRICS' | 'MESSAGE' | 'COUNTDOWN' | 'BLANK'

export interface StageContent {
  type:       StageContentType
  title?:     string
  body?:      string
  reference?: string
  countdown?: number
  style?:     Record<string, unknown>
}

// ── NDI ───────────────────────────────────────────────────────────────────────

export interface NDISource {
  name:    string
  url:     string
  online:  boolean
  latency: number
}

// ── WebSocket Events ──────────────────────────────────────────────────────────

export interface WSEvents {
  // Server → Client
  'scripture:detected':      DetectedScripture
  'scriptures:batch':        { streamId: string; scriptures: DetectedScripture[] }
  'stream:started':          { streamId: string }
  'stream:stopped':          { streamId: string }
  'poll:activated':          { pollId: string }
  'poll:closed':             { pollId: string }
  'quiz:activated':          { quizId: string }
  'qa:question':             { id: string; authorName: string; text: string; upvotes: number }
  'qa:answered':             { questionId: string; answer: string }
  'stage:update':            StageContent
  'webinar:started':         { webinarId: string }
  'webinar:ended':           { webinarId: string }
  'webinar:attendee':        { displayName: string }
  'ndi:sources':             NDISource[]
  'notification':            { id: string; title: string; body: string; type: string }
  // Client → Server
  'join:stream':             { streamId: string }
  'leave:stream':            { streamId: string }
  'join:webinar':            { webinarId: string }
  'stage:display:subscribe': void
}

// ── API Response wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success:   boolean
  data:      T
  timestamp: string
}

export interface PaginatedResponse<T> {
  data:  T[]
  total: number
  page:  number
  limit: number
}

export interface ApiError {
  success:    false
  error:      string
  statusCode: number
  timestamp:  string
}
