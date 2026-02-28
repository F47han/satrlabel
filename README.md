This repository contains the source code for the SATR website, including the dedicated Mood Page — a visual experience designed to showcase the emotional origins behind each abaya. The page presents a series of full‑screen moodboards with smooth horizontal sliding, mobile‑friendly interactions, and a looping animation that creates a continuous, immersive flow.

The Mood Page is built to match the exact layout, spacing, typography, and background of the SATR home page, ensuring a seamless and consistent brand experience.

Features Moodboard Slider Full‑screen horizontal slider

Smooth transitions with soft easing

Infinite looping (first → last → first)

Swipe support on mobile

Click‑and‑drag support on desktop

Responsive across all screen sizes

Image‑Ready Structure Each moodboard includes a dedicated  element where you can easily replace the filename with your own moodboard images.

Brand‑Consistent Design The page inherits all styling from the SATR home page:

Neutral colour palette

Minimal, elegant typography

Balanced spacing

Clean layout structure

File Structure Code /index.html → Home page
/mood.html → Mood page with slider
/style.css → Global styling
/script.js → Slider logic (swipe, drag, loop)
/images/ → Moodboard images
Updating Moodboard Images To update the images, replace the filenames inside each  tag:

html Laila Moodboard Place your images inside the /images folder and ensure the filenames match.

Slider Logic The slider is powered by lightweight JavaScript that handles:

Touch events

Mouse drag events

Looping transitions

Width calculations

The script is written without external libraries to keep performance high and the experience smooth.
