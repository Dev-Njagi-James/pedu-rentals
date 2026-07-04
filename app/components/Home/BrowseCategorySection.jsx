'use client'
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation'
import "../css/Home/BrowseCategorySection.css";
import Image from 'next/image'

const categories = [
  {
    id: "rental-apartments",
    label: "Rental Apartments",
    category_id: 1,
    image: "https://images.unsplash.com/photo-1629584603667-e8ad7c8feb0b?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "airbnb",
    label: "Airbnb and Hostels",
    category_id: 2,
    image: "https://images.unsplash.com/photo-1553444836-bc6c8d340ba7?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "commercial-spaces",
    label: "Commercial Spaces",
    category_id: 3,
    image: "https://images.unsplash.com/photo-1685009336777-3422a99d419b?q=80&w=2050&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "lodgings",
    label: "Lodgings",
    category_id: 4,
    image: "https://images.unsplash.com/photo-1610333684078-c89bd57f2e46?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "private-houses",
    category_id: 5,
    label: "Private Houses & Homes",
    image: "https://plus.unsplash.com/premium_photo-1742418054084-5b6037976b3f?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const CARD_WIDTH = 240;
const CARD_GAP = 20;


export default function BrowseByCategorySection() {
  const trackRef = useRef(null);
  const router = useRouter()
  const [ canPrev, setCanPrev ] = useState(false);
  const [ canNext, setCanNext ] = useState(true);
  const [ progress, setProgress ] = useState();

  const updateButtons = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanPrev(scrollLeft > 0);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 1); // -1 for rounding errors
    setProgress((scrollLeft / (scrollWidth - clientWidth)) * 100); // <-- update progress
  };

  useEffect(() => {
    updateButtons();
    const node = trackRef.current;
    if (!node) return;
    node.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);
    return () => {
      node.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, []);

  const scrollPrev = () => {
    trackRef.current.scrollBy({ left: -(CARD_WIDTH + CARD_GAP) });
  };
  const scrollNext = () => {
    trackRef.current.scrollBy({ left: CARD_WIDTH + CARD_GAP });
  };

  const handleCategoryClick = (category_id) => {
    if (!category_id) return
    router.push(`/properties?category_id=${category_id}`)
  }


  return (
    <section className="bbc-section">

      {/* Header row */}
      <div className="bbc-header">
        <div className="bbc-headline-wrap">
          <div className="bbc-headline-bar" />
          <h2 className="bbc-headline">Browse By Category</h2>
        </div>
        <p className="bbc-subtitle">
          Explore our full range of property types. Select a category to view all available listings filtered to what you need.
        </p>

        {/* Progress bar + controls */}
        <div className="bbc-controls-row">
          <div className="bbc-progress-wrap">
            <div className="bbc-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="bbc-arrows">
            <button
              className={`bbc-arrow ${!canPrev ? "bbc-arrow--disabled" : ""}`}
              onClick={scrollPrev}   // <-- was "prev"
              aria-label="Previous"
              disabled={!canPrev}
            >
              ←
            </button>
            <button
              className={`bbc-arrow bbc-arrow--active ${!canNext ? "bbc-arrow--disabled" : ""}`}
              onClick={scrollNext}   // <-- was "next"
              aria-label="Next"
              disabled={!canNext}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="bbc-carousel-outer" ref={trackRef}>
        <div className="bbc-carousel-track">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bbc-card"
              onClick={() => handleCategoryClick(cat.category_id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleCategoryClick(cat.category_id)
                }
              }}

            >
              <div className="bbc-card-img-wrap">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  width={240}
                  height={180}
                  className="bbc-card-img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.classList.add("bbc-card-img-fallback");
                  }}
                />
              </div>
              <p className="bbc-card-label">{cat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}