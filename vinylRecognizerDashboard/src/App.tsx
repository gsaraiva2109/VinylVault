import './App.css'
import Card from './components/Card'

const cardsData = [
  {
    title: 'Dark Side of the Moon',
    image: 'https://m.media-amazon.com/images/I/61hw9WloObL._UF1000,1000_QL80_.jpg',
    category: 'Rock',
    author: 'Pink Floyd',
    time: '15 min',
  },
  {
    title: 'Discover the sea',
    image: 'https://images.pexels.com/photos/307008/pexels-photo-307008.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260',
    category: 'Travel',
    author: 'John Doe',
    time: '5 min',
  },
  {
    title: 'Vinyl Recognizer Dashboard',
    image: 'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260',
    category: 'Music',
    author: 'Gabriel',
    time: '10 min',
  },
]

function App() {
  return (
    <div className="app-container">
      <h1>Vinyl Analyzer</h1>
      <section className="cards-container">
        {cardsData.map((card, index) => (
          <Card
            key={index}
            title={card.title}
            image={card.image}
            category={card.category}
            author={card.author}
            time={card.time}
          />
        ))}
      </section>
    </div>
  )
}

export default App