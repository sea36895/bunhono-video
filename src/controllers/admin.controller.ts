import type { Context } from 'hono'
import Layout from '../views/Layout'
import HomePage from '../views/Home'
import UserInfoPage from '../views/UserInfo'
import { getHomeData, getUserInfo } from '../services/admin.service'

// 首页控制器
export const homeHandler = (c: Context) => {
  const data = getHomeData()
  return c.html(
    <Layout title={data.title}>
      <HomePage />
    </Layout>
  )
}

// 用户页控制器
export const userHandler = async (c: Context) => {
  const user = await getUserInfo()
  return c.html(
    <Layout title="用户中心">
      <UserInfoPage user={user} />
    </Layout>
  )
}