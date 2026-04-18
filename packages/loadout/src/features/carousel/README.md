# Carousel Feature

Swiper-based carousel implementation with advanced features and type-safe configuration.

## Architecture

Follows Feature-Sliced Design (FSD) and Domain-Driven Design (DDD) principles with clear separation of concerns.

### Structure

```
src/features/carousel/
├── index.ts      # Public API and initialization
├── lib.ts        # Core carousel creation logic
├── model.ts      # Configuration building and module selection
├── types.ts      # Type definitions (derived from Swiper)
├── styles.css    # Carousel styles
└── README.md     # This file

```

### Module Registration Strategy

**Per-Instance Module Registration**: Swiper modules (Navigation, Pagination, EffectFade) are registered on a per-instance basis rather than globally. This ensures:

- Modules are only loaded when their corresponding DOM elements exist
- No initialization errors for carousels missing optional features
- Smaller bundle sizes when features aren't used
- Better memory management and performance

The `buildCarouselConfig()` function in [model.ts](./model.ts) automatically determines which modules are needed based on the carousel's configuration and DOM structure.

## Basic Usage

### HTML Structure in Webflow

```html
<div class="swiper" data-slider-instance>
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
    <div class="swiper-slide">Slide 2</div>
    <div class="swiper-slide">Slide 3</div>
  </div>
</div>
```

### TypeScript Initialization

```typescript
import { initCarousel } from './features/carousel';

window.Webflow ||= [];
window.Webflow.push(() => {
  initCarousel();
});
```

## Animation Approach: CSS First

**Recommended**: Use Swiper's built-in CSS classes (`.swiper-slide-active`, `.swiper-slide-prev`, `.swiper-slide-next`) for slide state styling. These are automatically applied by Swiper and require no additional configuration.

### Swiper's Built-in Classes (Always Available)

Swiper automatically applies these classes to slides - no configuration needed:

- `.swiper-slide-active` - Currently visible slide
- `.swiper-slide-prev` - Previous slide
- `.swiper-slide-next` - Next slide
- `.swiper-slide-visible` - All visible slides (when `slidesPerView > 1`)

### Custom State Markers (Opt-in)

When IX3 integration is enabled via `data-interaction-events="true"`, slides also receive `data-state` attributes:

- `data-state="active"` - Currently visible slide
- `data-state="prev"` - Previous slide (wraps with loop enabled)
- `data-state="next"` - Next slide (wraps with loop enabled)
- `data-state="inactive"` - All other slides

**Note:** These custom state markers are only applied when `data-interaction-events="true"` is set on the carousel container.

### CSS-Based Animations (Recommended)

Use Swiper's built-in classes to create smooth, performant animations:

```css
/* Fade in active slide */
.swiper-slide {
  opacity: 0.3;
  transition: opacity 0.4s ease;
}

.swiper-slide-active {
  opacity: 1;
}

/* Animate elements inside slides */
.swiper-slide .slide-title {
  transform: translateY(20px);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.swiper-slide-active .slide-title {
  transform: translateY(0);
  opacity: 1;
}
```

**Benefits of CSS animations:**
- Better performance (GPU-accelerated)
- No JavaScript overhead
- Works reliably with Swiper's dynamic DOM updates
- Easier to maintain and debug
- No IX3 configuration required

### IX3 Integration (Limited Use Cases)

**Important Limitation**: Webflow's IX3 does not update animations on reference target elements when their attributes change. This means IX3 animations **will not trigger** when slide `data-state` attributes update.

**When to use IX3 with carousels:**
- Global carousel events (initialization, destroy)
- Animations on static elements outside the carousel
- One-time animations that don't depend on slide state changes

**When NOT to use IX3:**
- Animating slide content based on active/inactive state (use CSS instead)
- Per-slide animations (use CSS instead)
- Any animation that needs to respond to `data-state` changes (use CSS instead)

### IX3 Configuration (Global Events Only)

```html
<div
  data-slider-instance="hero"
  data-interaction-events="true"
  class="swiper">
  <div class="swiper-wrapper"><!-- slides --></div>
</div>
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `data-slider-instance` | string | **Required.** Unique identifier for the carousel |
| `data-interaction-events` | string | **Opt-in.** Enable IX3 events ("on" or "true"). Default: disabled |
| `data-interaction-prefix` | string | Custom event prefix (default: "interaction") |

**Available IX3 Events:**
- `interaction:init` - When carousel initializes (emitted once)

**Example: Animate a header when carousel initializes**

```html
<!-- Carousel -->
<div
  data-slider-instance="hero"
  data-interaction-events="true"
  class="swiper">
  <div class="swiper-wrapper"><!-- slides --></div>
</div>

<!-- Static element outside carousel -->
<div class="page-header">Welcome</div>
```

In Webflow IX3:
1. Create interaction with trigger: Custom event `interaction:init`
2. Target: `.page-header`
3. Animation: Fade in or slide down

### Best Practices

1. **Prefer CSS**: Use CSS transitions/animations for all slide-related animations
2. **Use Swiper Classes**: Prefer `.swiper-slide-active` over `[data-state="active"]` as they work without IX3 enabled
3. **Use IX3 Sparingly**: Only use IX3 for global carousel events or static elements outside the carousel
4. **Scope Your Selectors**: Combine carousel class and state: `.my-carousel .swiper-slide-active`
5. **Performance**: CSS animations are GPU-accelerated and more efficient than IX3

## Configuration via Data Attributes

All configuration is done through HTML data attributes on the carousel container.

### Basic Configuration

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-slider-instance` | Required | - | Identifies element as carousel |
| `data-effect` | string | `'slide'` | Transition effect (see Effects section) |
| `data-slides-per-view` | number\|'auto' | `1` | Number of slides visible at once |
| `data-space-between` | number | `0` | Space between slides in pixels |
| `data-centered-slides` | boolean | `false` | Center the active slide (empty string or 'true' = true) |
| `data-loop` | boolean | `true` | Enable loop mode (empty string or 'true' = true, 'false' = false) |
| `data-crossfade` | boolean | `false` | Enable cross-fade for fade effect (empty string or 'true' = true) |
| `data-no-swiping-selector` | string | `'[data-no-swiping]'` | CSS selector for elements that prevent swiping |

**Example:**

```html
<div class="swiper"
     data-slider-instance
     data-effect="slide"
     data-slides-per-view="3"
     data-space-between="20">
  <!-- slides -->
</div>
```

### Available Effects

All effects are type-safe and derived from Swiper's library types:

- `slide` (default) - Standard horizontal/vertical sliding
- `fade` - Cross-fade transitions
- `cube` - 3D cube rotation
- `coverflow` - Apple Cover Flow effect
- `flip` - 3D flip animation
- `creative` - Custom creative transitions
- `cards` - Stack of cards effect

**Example with fade effect:**

```html
<div class="swiper"
     data-slider-instance
     data-effect="fade"
     data-crossfade>
  <!-- slides -->
</div>
```

**Example with centered slides:**

```html
<div class="swiper"
     data-slider-instance
     data-slides-per-view="3"
     data-space-between="20"
     data-centered-slides>
  <!-- slides -->
</div>
```

**Example with loop disabled:**

```html
<div class="swiper"
     data-slider-instance
     data-loop="false">
  <!-- slides -->
</div>
```

## Styling Active and Inactive Slides

Swiper automatically adds CSS classes to slides that you can use for styling. This is perfect for creating visual effects where the active slide stands out.

### CSS Classes Available

Swiper provides these built-in classes:

- `.swiper-slide-active` - The currently active/centered slide
- `.swiper-slide-prev` - The slide immediately before the active one
- `.swiper-slide-next` - The slide immediately after the active one
- `.swiper-slide-visible` - All slides currently visible in the viewport (when `slidesPerView > 1`)
- `.swiper-slide-duplicate` - Cloned slides used for loop effect

### Common Use Cases

#### 1. Fade Out Inactive Slides

```css
.swiper-slide {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.swiper-slide-active {
  opacity: 1;
}
```

#### 2. Scale Up Active Slide (Great with Centered Slides)

```css
.swiper-slide {
  transform: scale(0.8);
  transition: transform 0.3s ease;
}

.swiper-slide-active {
  transform: scale(1);
}
```

#### 3. Blur Inactive Slides

```css
.swiper-slide {
  filter: blur(3px);
  transition: filter 0.3s ease;
}

.swiper-slide-active {
  filter: blur(0);
}
```

#### 4. Grayscale/Color Effect

```css
.swiper-slide {
  filter: grayscale(100%);
  transition: filter 0.3s ease;
}

.swiper-slide-active {
  filter: grayscale(0);
}
```

#### 5. Combination Effect (Popular for Centered Carousels)

```css
.swiper-slide {
  opacity: 0.4;
  transform: scale(0.85);
  filter: blur(2px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.swiper-slide-active {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
  z-index: 10;
}

/* Optional: Style adjacent slides differently */
.swiper-slide-prev,
.swiper-slide-next {
  opacity: 0.6;
  transform: scale(0.9);
}
```

#### 6. Shadow and Elevation Effect

```css
.swiper-slide {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
  transition: all 0.3s ease;
}

.swiper-slide-active {
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-8px);
}
```

### Complete Example with HTML

**HTML:**
```html
<div class="hero-carousel swiper"
     data-slider-instance
     data-slides-per-view="3"
     data-space-between="30"
     data-centered-slides>
  <div class="swiper-wrapper">
    <div class="swiper-slide">
      <img src="image1.jpg" alt="Slide 1">
      <h3>Slide Title 1</h3>
    </div>
    <div class="swiper-slide">
      <img src="image2.jpg" alt="Slide 2">
      <h3>Slide Title 2</h3>
    </div>
    <div class="swiper-slide">
      <img src="image3.jpg" alt="Slide 3">
      <h3>Slide Title 3</h3>
    </div>
  </div>
</div>
```

**CSS:**
```css
/* Base slide styling */
.hero-carousel .swiper-slide {
  opacity: 0.5;
  transform: scale(0.85);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  overflow: hidden;
}

/* Active slide gets full attention */
.hero-carousel .swiper-slide-active {
  opacity: 1;
  transform: scale(1);
  z-index: 10;
}

/* Style images inside slides */
.hero-carousel .swiper-slide img {
  width: 100%;
  height: auto;
  display: block;
}

/* Style text content */
.hero-carousel .swiper-slide h3 {
  padding: 1rem;
  margin: 0;
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hero-carousel .swiper-slide-active h3 {
  opacity: 1;
}
```

### Advanced: Targeting Slides by Position

Use CSS selectors to target slides based on their position relative to the active slide:

```css
/* Target all inactive slides */
.swiper-slide:not(.swiper-slide-active) {
  opacity: 0.5;
  pointer-events: none;
}

/* Target first slide after active */
.swiper-slide-active + .swiper-slide {
  opacity: 0.7;
}

/* Target slide before active (using :has selector - modern browsers) */
.swiper-slide:has(+ .swiper-slide-active) {
  opacity: 0.7;
}
```

### Tips for Webflow

1. **Add custom class to your carousel container** for scoped styling:
   ```html
   <div class="my-carousel swiper" data-slider-instance>
   ```

2. **Use Webflow's embed element** to add custom CSS:
   - Add an Embed element to your page
   - Wrap your styles in `<style>` tags
   - Use the custom class to scope your styles

3. **Test in preview mode** to see the active/inactive classes in action

4. **Add smooth transitions** to make the effect feel polished:
   ```css
   .swiper-slide {
     transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
   }
   ```

All of these classes are automatically applied by Swiper as users navigate through the carousel. No additional JavaScript configuration needed!

## Preventing Swipe on Specific Elements

Sometimes you need to prevent swiping on certain elements inside your slides, such as buttons, links, or interactive components. Swiper provides a built-in solution for this.

### How It Works

Two methods are available for preventing swipe on elements:

1. **Data attribute (Recommended)**: Add `data-no-swiping` to any element - enabled by default
2. **CSS class**: Add `swiper-no-swiping` class to any element

### Basic Usage

```html
<div class="swiper" data-slider-instance>
  <div class="swiper-wrapper">
    <div class="swiper-slide">
      <img src="image1.jpg" alt="Slide 1">

      <!-- Method 1: Data attribute (recommended) -->
      <button data-no-swiping>Click Me</button>
    </div>

    <div class="swiper-slide">
      <img src="image2.jpg" alt="Slide 2">

      <!-- Method 2: CSS class -->
      <a href="#" class="swiper-no-swiping">Learn More</a>
    </div>
  </div>
</div>
```

### Custom Selector

You can customize the no-swiping selector using the `data-no-swiping-selector` attribute:

```html
<div class="swiper"
     data-slider-instance
     data-no-swiping-selector="[data-interactive]">
  <div class="swiper-wrapper">
    <div class="swiper-slide">
      <!-- Uses custom selector -->
      <button data-interactive>Click Me</button>
    </div>
  </div>
</div>
```

### Common Use Cases

#### 1. Interactive Buttons

```html
<div class="swiper-slide">
  <div class="card">
    <img src="product.jpg" alt="Product">
    <h3>Product Name</h3>
    <p>Description text...</p>

    <!-- User can click/tap without triggering swipe -->
    <button class="swiper-no-swiping btn-primary">
      Add to Cart
    </button>
  </div>
</div>
```

#### 2. Links and Navigation

```html
<div class="swiper-slide">
  <article>
    <h2>Blog Post Title</h2>
    <p>Excerpt of the blog post...</p>

    <!-- User can click link without swiping -->
    <a href="/blog/post" class="swiper-no-swiping">
      Read More →
    </a>
  </article>
</div>
```

#### 3. Form Inputs

```html
<div class="swiper-slide">
  <div class="form-container swiper-no-swiping">
    <!-- Entire form area prevents swiping -->
    <input type="email" placeholder="Email">
    <input type="text" placeholder="Name">
    <button type="submit">Subscribe</button>
  </div>
</div>
```

#### 4. Video Players or Interactive Media

```html
<div class="swiper-slide">
  <!-- Prevent swiping on video so users can interact with controls -->
  <video class="swiper-no-swiping" controls>
    <source src="video.mp4" type="video/mp4">
  </video>
</div>
```

#### 5. Custom Interactive Components

```html
<div class="swiper-slide">
  <div class="product-card">
    <img src="product.jpg" alt="Product">

    <!-- Entire action area prevents swiping -->
    <div class="actions swiper-no-swiping">
      <button class="btn-wishlist">♥</button>
      <button class="btn-cart">Add to Cart</button>
      <button class="btn-share">Share</button>
    </div>
  </div>
</div>
```

### Webflow Implementation

**Method 1: Add Class in Webflow Designer**
1. Select the element (button, link, etc.)
2. In the Style panel, add the class `swiper-no-swiping`
3. The element will now prevent swiping when interacted with

**Method 2: Add via Custom Attribute**
1. Select the element
2. In the Settings panel, add a custom attribute
3. Name: `class`, Value: `swiper-no-swiping`

### Styling No-Swiping Elements

You can style elements with the no-swiping class to indicate they're interactive:

```css
.swiper-no-swiping {
  cursor: pointer;
  user-select: none;
}

/* Indicate interactive elements on hover */
.swiper-slide .swiper-no-swiping:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

/* Buttons with no-swiping */
button.swiper-no-swiping,
a.swiper-no-swiping {
  position: relative;
  z-index: 10; /* Ensure buttons are above slide */
}
```

### Important Notes

1. **Mobile Touch**: On mobile devices, tapping/touching elements with `swiper-no-swiping` will trigger the element's action instead of starting a swipe.

2. **Parent Containers**: You can add the class to a parent container to prevent swiping on all child elements:
   ```html
   <div class="interactive-area swiper-no-swiping">
     <button>Button 1</button>
     <button>Button 2</button>
     <a href="#">Link</a>
   </div>
   ```

3. **Still Navigable**: Users can still swipe on other areas of the slide to navigate. The no-swiping class only prevents swiping on specific elements.

4. **Accessibility**: Elements with `swiper-no-swiping` remain fully accessible via keyboard and assistive technologies.

### Troubleshooting

**Problem**: Swiping still works on my button
- **Solution**: Ensure the class name is exactly `swiper-no-swiping` (check for typos)
- **Solution**: Check that the element isn't covered by another element with higher z-index

**Problem**: Click/tap not working on mobile
- **Solution**: Add `cursor: pointer` to the element's CSS
- **Solution**: Ensure the element has appropriate touch-action CSS properties

**Problem**: Need to disable swiping everywhere
- **Solution**: Add `swiper-no-swiping` class to the entire slide:
  ```html
  <div class="swiper-slide swiper-no-swiping">
    <!-- All content here prevents swiping -->
  </div>
  ```

## Navigation Configuration

Attribute-based navigation element assignment with flexible selector options.

### Method 1: Class-based (Traditional)

```html
<div class="swiper" data-slider-instance>
  <div class="swiper-wrapper"><!-- slides --></div>

  <!-- Navigation buttons with default classes -->
  <button class="slider-prev">Previous</button>
  <button class="slider-next">Next</button>
</div>
```

### Method 2: Attribute-based Assignment

```html
<div class="swiper"
     data-slider-instance
     data-nav-prev="prev-button"
     data-nav-next="next-button">
  <div class="swiper-wrapper"><!-- slides --></div>

  <!-- Assign elements using data attributes -->
  <button data-carousel-element="prev-button">Prev</button>
  <button data-carousel-element="next-button">Next</button>
</div>
```

### Method 3: CSS Selector

```html
<div class="swiper"
     data-slider-instance
     data-nav-prev=".custom-prev"
     data-nav-next=".custom-next">
  <div class="swiper-wrapper"><!-- slides --></div>

  <!-- Use custom CSS selectors -->
  <button class="custom-prev">Previous</button>
  <button class="custom-next">Next</button>
</div>
```

**Fallback Behavior**: If no custom selectors are provided, defaults to `.slider-prev` and `.slider-next` classes.

## Pagination Configuration

**NEW FEATURE**: Attribute-based pagination element assignment.

### Method 1: Class-based (Traditional)

```html
<div class="swiper" data-slider-instance>
  <div class="swiper-wrapper"><!-- slides --></div>

  <!-- Pagination with default class -->
  <div class="swiper-pagination"></div>
</div>
```

### Method 2: Attribute-based Assignment

```html
<div class="swiper"
     data-slider-instance
     data-pagination="dots">
  <div class="swiper-wrapper"><!-- slides --></div>

  <!-- Assign pagination element -->
  <div data-carousel-element="dots"></div>
</div>
```

### Method 3: CSS Selector

```html
<div class="swiper"
     data-slider-instance
     data-pagination=".custom-pagination">
  <div class="swiper-wrapper"><!-- slides --></div>

  <!-- Use custom CSS selector -->
  <div class="custom-pagination"></div>
</div>
```

**Fallback Behavior**: If no custom selector is provided, defaults to `.swiper-pagination` class.

## Responsive Breakpoints

**NEW FEATURE**: Configure different slide counts at different screen sizes.

### Configuration Format

Breakpoints are configured via JSON in the `data-breakpoints` attribute:

```html
<div class="swiper"
     data-slider-instance
     data-slides-per-view="1"
     data-breakpoints='{"640":{"slidesPerView":2,"spaceBetween":20},"1024":{"slidesPerView":3,"spaceBetween":30}}'>
  <div class="swiper-wrapper"><!-- slides --></div>
</div>
```

### Breakpoint Object Structure

```typescript
{
  [breakpointWidth: number]: {
    slidesPerView?: number | 'auto';
    spaceBetween?: number;
    slidesPerGroup?: number;
  }
}
```

**Example Configuration:**

```json
{
  "320": {
    "slidesPerView": 1,
    "spaceBetween": 10
  },
  "640": {
    "slidesPerView": 2,
    "spaceBetween": 20
  },
  "1024": {
    "slidesPerView": 3,
    "spaceBetween": 30
  },
  "1440": {
    "slidesPerView": 4,
    "spaceBetween": 40
  }
}
```

### Alternative: CSS-Based Responsive Pattern

For Webflow-friendly editing, you can use CSS custom properties with container queries:

**HTML:**

```html
<div class="slider-container" data-slider-instance>
  <div class="swiper-wrapper">
    <!-- Slides -->
  </div>
</div>
```

**CSS:**

```css
.slider-container {
  /* Define breakpoint variables */
  --slide-count: var(--lg);
  --lg: 3;
  --md: var(--lg);
  --sm: var(--md);
  --xs: var(--sm);
}

/* Apply breakpoints using container queries */
@container (width < 50em) {
  .slider-container { --slide-count: var(--md); }
}
@container (width < 35em) {
  .slider-container { --slide-count: var(--sm); }
}
@container (width < 20em) {
  .slider-container { --slide-count: var(--xs); }
}

/* Apply to slides */
.swiper-wrapper > .swiper-slide {
  width: calc(100% / var(--slide-count)) !important;
  padding-inline: calc(var(--gap-size, 1rem) / 2);
}
```

**Benefits:**
- Easy to edit in Webflow's style panel
- No JSON configuration needed
- Visual feedback in Webflow Designer
- Container query support for nested layouts

## Complete Example

```html
<!-- Full-featured carousel with all options -->
<div class="swiper"
     data-slider-instance
     data-effect="slide"
     data-slides-per-view="1"
     data-space-between="0"
     data-nav-prev="my-prev"
     data-nav-next="my-next"
     data-pagination="my-dots"
     data-breakpoints='{"640":{"slidesPerView":2,"spaceBetween":20},"1024":{"slidesPerView":3,"spaceBetween":30}}'>

  <!-- Slides wrapper -->
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
    <div class="swiper-slide">Slide 2</div>
    <div class="swiper-slide">Slide 3</div>
    <div class="swiper-slide">Slide 4</div>
    <div class="swiper-slide">Slide 5</div>
  </div>

  <!-- Custom navigation -->
  <button data-carousel-element="my-prev">←</button>
  <button data-carousel-element="my-next">→</button>

  <!-- Custom pagination -->
  <div data-carousel-element="my-dots"></div>
</div>
```

## Type Safety

This feature follows best practices by:
- Using Swiper's types directly where needed (no redundant re-exports)
- Only defining domain-specific types (e.g., `CarouselDataset`, `CarouselInstance`, `CarouselConfig`)
- Maintaining single source of truth from the Swiper library
- Avoiding type duplication and unnecessary abstraction layers

**Type Imports:**

```typescript
// Domain-specific types from our carousel feature
import type { CarouselInstance } from './features/carousel';
import type { CarouselConfig } from './features/carousel/model';

// Use Swiper types directly when needed
import type { SwiperOptions } from 'swiper/types';

// Example: Custom configuration
const customConfig: SwiperOptions = {
  slidesPerView: 3,
  spaceBetween: 20,
  // Full autocomplete support
};
```

### CarouselConfig Interface

The `CarouselConfig` interface returned by `buildCarouselConfig()` includes:

```typescript
interface CarouselConfig {
  modules: SwiperModule[];  // Required modules for this instance
  options: SwiperOptions;    // Swiper configuration options
}
```

This separation allows the carousel to dynamically include only the modules it needs.

## Programmatic Usage

### Create a single carousel

```typescript
import { createCarousel } from './features/carousel';

const element = document.querySelector('.my-carousel') as HTMLElement;
const carousel = createCarousel(element);

// Later, destroy when needed
carousel?.destroy();
```

### Initialize all carousels

```typescript
import { initCarousel, destroyCarousel } from './features/carousel';

// Initialize all carousels on page
initCarousel();

// Destroy all carousels (e.g., on route change)
destroyCarousel();
```

## Best Practices

1. **Always include required HTML structure:**
   - Container with `data-slider-instance`
   - `.swiper-wrapper` for slides container
   - `.swiper-slide` for each slide

2. **Use data attributes for configuration:**
   - Keeps HTML semantic
   - Easy to manage in Webflow
   - No JavaScript configuration needed

3. **Leverage type safety:**
   - Import types for custom implementations
   - Use IDE autocomplete for valid values
   - Catch errors at compile time

4. **Performance considerations:**
   - Use `data-slides-per-view="auto"` for variable-width slides
   - Disable loop mode with `data-loop="false"` when not needed (default is `true`)
   - Consider lazy loading for image-heavy carousels

5. **Accessibility:**
   - Navigation buttons are automatically keyboard accessible
   - Pagination dots are clickable by default
   - Consider adding ARIA labels to navigation elements

## Troubleshooting

### Carousel not initializing

- Verify `data-slider-instance` attribute is present
- Check that `.swiper-wrapper` exists inside container
- Ensure slides have `.swiper-slide` class
- Check browser console for errors

### Navigation buttons not working

- Verify button selectors are correct
- Check that buttons are inside or adjacent to carousel container
- Navigation module is registered automatically when navigation elements are found

### Pagination not working

- Verify pagination element exists in the DOM
- Check that the selector or data attribute matches the element
- Pagination module is registered automatically when pagination element is found

### Breakpoints not applying

- Validate JSON syntax in `data-breakpoints` attribute
- Check browser console for parsing warnings
- Ensure breakpoint keys are numbers, not strings

### Effects not working

- Verify the effect is supported (see Available Effects section)
- EffectFade is registered automatically when `data-effect="fade"` is used
- For other effects (cube, coverflow, flip, creative, cards), modules need to be added to [model.ts](./model.ts)

### TypeError: Cannot read properties of undefined

If you see errors like `Cannot read properties of undefined (reading 'el')`:
- This typically means a Swiper module is globally registered but the carousel doesn't have required DOM elements
- Our implementation fixes this by using per-instance module registration
- Modules are only registered when their corresponding elements exist in the DOM

## API Reference

### Exported Functions

#### `initCarousel(): void`

Initializes all carousel instances on the page by finding all elements with `[data-slider-instance]` attribute.

#### `destroyCarousel(): void`

Destroys all carousel instances and cleans up event listeners.

#### `createCarousel(element: HTMLElement): CarouselInstance | null`

Creates a single carousel instance from an HTML element.

**Parameters:**
- `element`: The carousel container element

**Returns:**
- `CarouselInstance` object with `destroy()` method, or `null` if invalid

### Exported Types

#### `CarouselInstance`

Our domain-specific interface for initialized carousels:

```typescript
interface CarouselInstance {
  element: HTMLElement;
  destroy: () => void;
}
```

#### `CarouselConfig`

Configuration object returned by `buildCarouselConfig()`:

```typescript
interface CarouselConfig {
  modules: SwiperModule[];  // Modules required for this instance
  options: SwiperOptions;    // Swiper configuration options
}
```

This interface enables per-instance module registration, ensuring only necessary modules are loaded.

#### Using Swiper Types

For Swiper-specific types, import directly from the library:

```typescript
import type { SwiperOptions, SwiperModule } from 'swiper/types';

// Access specific option types
type Effect = SwiperOptions['effect'];
type Breakpoints = SwiperOptions['breakpoints'];
type Navigation = SwiperOptions['navigation'];
type Pagination = SwiperOptions['pagination'];
```

This approach:
- Eliminates redundant type definitions
- Ensures types stay in sync with Swiper updates
- Provides full IDE autocomplete from the source
- Follows single source of truth principle

## Version Information

- **Swiper Version**: 12.0.3
- **Type Definitions**: Directly from Swiper library
- **Last Updated**: October 2025
