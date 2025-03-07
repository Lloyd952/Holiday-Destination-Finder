let map;
let markers = [];
let infoWindows = [];
const locationIqApiKey = "pk.3e26bc2547f94b4da7ee3f0c41b84f33";
const unsplashApiKey = "l2hoLXEKIx9ejS_Qn3xFmqsPP8YJpb45IZabRczcYIQ";
const openWeatherApiKey = "737088ddcdfc1b066a58b163b087a13e";

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Close the hamburger menu on mobile after clicking a link
      if (navLinks.classList.contains("active")) {
        navLinks.classList.remove("active");
      }
    }
  });
});

// Initialize the map
function initMap() {
  const defaultLocation = { lat: 51.5074, lng: -0.1278 }; // London

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 12,
    mapId: "fe39ff303f24e47f", // Optional
  });
}

// Handle search form submission
function handleSearch(event) {
  event.preventDefault();

  const searchInput = document.getElementById("search-input").value.trim();
  if (!searchInput) {
    alert("Please enter a city or destination.");
    return;
  }

  showLoading();

  // Fetch location data from LocationIQ Geocoding API
  fetch(
    `https://api.locationiq.com/v1/search?key=${locationIqApiKey}&q=${searchInput}&format=json`
  )
    .then((response) => response.json())
    .then((data) => {
      hideLoading();

      if (data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        const cityName = location.display_name;

        // Center the map on the searched location
        map.setCenter({ lat, lng: lon });
        map.setZoom(14);

        // Clear existing markers
        clearMarkers();

        // Add a marker for the searched location
        new google.maps.Marker({
          position: { lat, lng: lon },
          map: map,
          title: cityName,
        });

        // Fetch and display city details
        fetchCityData(cityName, lat, lon);
      } else {
        alert("Location not found. Please try again.");
      }
    })
    .catch((error) => {
      hideLoading();
      console.error("Error fetching location data:", error);
      alert("An error occurred. Please try again later.");
    });
}

// Fetch and display city details
function fetchCityData(cityName, lat, lon) {
  const cityInfoContainer = document.getElementById("city-info");
  cityInfoContainer.innerHTML = `<p>Loading city details for ${cityName}...</p>`;

  // Fetch city image from Unsplash
  const unsplashUrl = `https://api.unsplash.com/search/photos?query=${cityName}&client_id=${unsplashApiKey}`;

  // Fetch weather data from OpenWeatherMap
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherApiKey}`;

  // Fetch additional city details from LocationIQ (optional)
  const locationIqUrl = `https://us1.locationiq.com/v1/reverse.php?key=${locationIqApiKey}&lat=${lat}&lon=${lon}&format=json`;

  Promise.all([fetch(unsplashUrl), fetch(weatherUrl), fetch(locationIqUrl)])
    .then(async ([imagesRes, weatherRes, locationIqRes]) => {
      const imagesData = await imagesRes.json();
      const weatherData = await weatherRes.json();
      const locationIqData = await locationIqRes.json();

      // City image
      const imageUrl =
        imagesData.results.length > 0
          ? imagesData.results[0].urls.regular
          : "assets/images/default-city.jpg";

      // Weather information
      const temperature = weatherData.main ? weatherData.main.temp : "N/A";
      const weatherDesc = weatherData.weather
        ? weatherData.weather[0].description
        : "N/A";

      // Population and country (optional)
      const population = locationIqData.address.population || "N/A";
      const country = locationIqData.address.country || "N/A";

      // Update city info section
      cityInfoContainer.innerHTML = `
        <div class="city-info-container">
          <div class="city-image">
            <img src="${imageUrl}" alt="${cityName}" />
          </div>
          <div class="city-details">
            <h3>${cityName}</h3>
            <p><strong>Weather:</strong> ${temperature}°C, ${weatherDesc}</p>
            <p>Explore nearby attractions, restaurants, and accommodations using the map filters above.</p>
            <div class="city-stats">
              <div class="stat">
                <i class="fas fa-users"></i>
                <p>Population: <span>${population}</span></p>
              </div>
              <div class="stat">
                <i class="fas fa-globe"></i>
                <p>Country: <span>${country}</span></p>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .catch((error) => {
      cityInfoContainer.innerHTML = `<p>Could not fetch additional information for ${cityName}.</p>`;
      console.error("City data fetch error:", error);
    });
}

// Handle filter button clicks
function filterPlaces(type) {
  showLoading();

  const center = map.getCenter();

  // Fetch nearby places from LocationIQ
  fetch(
    `https://api.locationiq.com/v1/nearby.php?key=${locationIqApiKey}&lat=${center.lat()}&lon=${center.lng()}&tag=${type}&radius=5000&format=json`
  )
    .then((response) => response.json())
    .then((data) => {
      hideLoading();

      if (data.length > 0) {
        clearMarkers();

        data.forEach((place) => {
          const marker = new google.maps.Marker({
            position: {
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
            },
            map: map,
            title: place.display_name || place.name,
          });

          const addressParts = [];
          if (place.address) {
            if (place.address.road) addressParts.push(place.address.road);
            if (place.address.city) addressParts.push(place.address.city);
            if (place.address.postcode)
              addressParts.push(place.address.postcode);
          }
          const formattedAddress = addressParts.join(", ");

          const infoWindow = new google.maps.InfoWindow({
            content: `
      <div>
        <strong>${place.name || place.tag}</strong><br>
        ${formattedAddress ? `<p>Address: ${formattedAddress}</p>` : ""}
        ${place.rating ? `<p>Rating: ${place.rating}</p>` : ""}
      </div>
    `,
          });

          marker.addListener("click", () => {
            closeAllInfoWindows();
            infoWindow.open(map, marker);
          });

          markers.push(marker);
          infoWindows.push(infoWindow);
        });
      } else {
        alert("No places found for this category.");
      }
    })
    .catch((error) => {
      hideLoading();
      console.error("Error fetching nearby places:", error);
      alert("An error occurred. Please try again later.");
    });
}

// Close all info windows
function closeAllInfoWindows() {
  infoWindows.forEach((infoWindow) => infoWindow.close());
}

// Clear all markers from the map
function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

// Show loading overlay
function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
}

// Hide loading overlay
function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

// Add event listeners
document.getElementById("search-form").addEventListener("submit", handleSearch);
document
  .getElementById("filter-attractions")
  .addEventListener("click", () => filterPlaces("tourism"));
document
  .getElementById("filter-accommodations")
  .addEventListener("click", () => filterPlaces("hotel"));
document
  .getElementById("filter-restaurants")
  .addEventListener("click", () => filterPlaces("restaurant"));

// Initialize the map when the page loads
window.initMap = initMap;

// Toggle Hamburger Menu
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

document.getElementById("paris").addEventListener("click", () => {
  document.getElementById("search-input").value = "Paris";
  handleSearch(new Event("submit"));
});

document.getElementById("newyork").addEventListener("click", () => {
  document.getElementById("search-input").value = "New York";
  handleSearch(new Event("submit"));
});

document.getElementById("tokyo").addEventListener("click", () => {
  document.getElementById("search-input").value = "Tokyo";
  handleSearch(new Event("submit"));
});
