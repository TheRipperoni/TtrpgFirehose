export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  repo_like: RepoLike
}

export type Post = {
  uri: string
  cid: string
  author: string
  parentUri: string | null
  parentCid: string | null
  rootUri: string
  rootCid: string
  indexedAt: string
  status: number
  text: string
}

export type SubState = {
  service: string
  cursor: number
}

export type RepoLike = {
  uri: string,
  cid: string,
  author: string,
  indexedAt: string,
  status: number
}
