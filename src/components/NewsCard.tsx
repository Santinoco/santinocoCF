import { Link } from 'react-router-dom'
import type { News } from '../lib/types'
import { timeAgo } from '../lib/utils'

const COLORS = ['pink', 'yellow', 'blue', 'green', 'purple']
export function categoryColor(cat: string) {
  let h = 0
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function NewsCard({ news, big = false }: { news: News; big?: boolean }) {
  return (
    <Link to={`/novedades/${news.slug}`} className={`news-card card ${big ? 'news-big' : ''}`}>
      <div className="news-img">
        {news.cover_url ? (
          <img src={news.cover_url} alt="" loading="lazy" />
        ) : (
          <div className={`news-img-ph bg-${categoryColor(news.category)}`}>📰</div>
        )}
        <span className={`sticker sticker-abs bg-${categoryColor(news.category)}`}>{news.category}</span>
      </div>
      <div className="news-body">
        <h3>{news.title}</h3>
        {news.summary && <p className="muted clamp-2">{news.summary}</p>}
        <span className="news-meta">{timeAgo(news.created_at)}</span>
      </div>
    </Link>
  )
}
