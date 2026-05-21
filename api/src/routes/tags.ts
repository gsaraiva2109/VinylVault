import { Router } from 'express'
import { GENRE_TAGS, MOODS, ERA_PATTERN, MAX_GENRE_TAGS } from '../services/tag-vocab'

const router = Router()

/**
 * @swagger
 * /api/tags/vocabulary:
 *   get:
 *     summary: Controlled vocabulary the API will accept on PATCH /api/vinyls/:id
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Allowed genre tags, moods, era pattern, and limits
 */
router.get('/vocabulary', (_req, res) => {
  res.json({
    genreTags: GENRE_TAGS,
    moods: MOODS,
    eraPattern: ERA_PATTERN.source,
    maxGenreTags: MAX_GENRE_TAGS,
  })
})

export default router
