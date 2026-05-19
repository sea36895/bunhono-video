import { Hono } from 'hono'
import { homeHandler, userHandler } from '../controllers/admin.controller'

const pageRouter = new Hono()

pageRouter.get('/', homeHandler)
pageRouter.get('/user', userHandler)

export default pageRouter