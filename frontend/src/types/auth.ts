export interface OrgRef {
  id: number
  name: string
  code: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string | null
  status: string
  branch?: OrgRef
  department?: OrgRef
  roles: string[]
  permissions: string[]
  last_login_at: string | null
}
