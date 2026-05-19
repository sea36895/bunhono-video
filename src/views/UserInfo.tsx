interface UserData {
  id: number
  username: string
  age: number
}

export default function UserPage({ user }: { user: UserData }) {
  return (
    <div class="card">
      <h4>用户信息</h4>
      <p>ID：{user.id}</p>
      <p>用户名：{user.username}</p>
      <p>年龄：{user.age}</p>
    </div>
  )
}