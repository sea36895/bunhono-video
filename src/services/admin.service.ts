// 模拟数据库/业务逻辑
export const getHomeData = () => {
  return { title: "首页标题" }
}

export const getUserInfo = async () => {
  // 模拟异步查库
  await new Promise(r => setTimeout(r, 10))
  return {
    id: 1001,
    username: "测试用户",
    age: 22
  }
}