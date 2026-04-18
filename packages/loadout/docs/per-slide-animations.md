# Per-Slide Animations: CSS Approach (Recommended)

**Important**: Webflow's IX3 does not update animations on reference target elements when their attributes change. This means IX3 animations will **not trigger** when slide `data-state` attributes update.

**Use CSS animations instead** for per-slide effects. CSS is more performant, reliable, and works seamlessly with Swiper's dynamic updates.

## CSS-Based Per-Slide Animations (Recommended)

Each slide automatically receives a `data-state` attribute that you can target with CSS:

- `data-state="active"` - Currently visible slide
- `data-state="prev"` - Previous slide
- `data-state="next"` - Next slide
- `data-state="inactive"` - All other slides

### Basic Example: Fade and Scale

```css
/* Base state for all slides */
.swiper-slide {
  opacity: 0.3;
  transform: scale(0.9);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Active slide */
.swiper-slide[data-state="active"] {
  opacity: 1;
  transform: scale(1);
}
```

### Animating Content Inside Slides

```css
/* Slide title - hidden by default */
.swiper-slide .slide-title {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0s;
}

/* Slide title - visible when slide is active */
.swiper-slide[data-state="active"] .slide-title {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.1s; /* Delay for staggered effect */
}

/* Slide description */
.swiper-slide .slide-description {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0s;
}

.swiper-slide[data-state="active"] .slide-description {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.2s; /* Stagger after title */
}

/* Slide button */
.swiper-slide .slide-button {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0s;
}

.swiper-slide[data-state="active"] .slide-button {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.3s; /* Stagger after description */
}
```

### Per-Slide Unique Animations

Target specific slides using nth-child selectors combined with data-state:

```css
/* First slide - slide from left */
.swiper-slide:nth-child(1) .slide-content {
  transform: translateX(-30px);
  opacity: 0;
  transition: all 0.6s ease;
}

.swiper-slide:nth-child(1)[data-state="active"] .slide-content {
  transform: translateX(0);
  opacity: 1;
}

/* Second slide - slide from right */
.swiper-slide:nth-child(2) .slide-content {
  transform: translateX(30px);
  opacity: 0;
  transition: all 0.6s ease;
}

.swiper-slide:nth-child(2)[data-state="active"] .slide-content {
  transform: translateX(0);
  opacity: 1;
}

/* Third slide - scale up */
.swiper-slide:nth-child(3) .slide-content {
  transform: scale(0.8);
  opacity: 0;
  transition: all 0.6s ease;
}

.swiper-slide:nth-child(3)[data-state="active"] .slide-content {
  transform: scale(1);
  opacity: 1;
}
```

### Complete Example with HTML

```html
<div class="swiper" data-slider-instance="hero">
  <div class="swiper-wrapper">
    
    <div class="swiper-slide">
      <div class="slide-content">
        <h2 class="slide-title">Slide 1</h2>
        <p class="slide-description">Description for slide 1</p>
        <button class="slide-button">Learn More</button>
      </div>
    </div>
    
    <div class="swiper-slide">
      <div class="slide-content">
        <h2 class="slide-title">Slide 2</h2>
        <p class="slide-description">Description for slide 2</p>
        <button class="slide-button">Learn More</button>
      </div>
    </div>
    
    <div class="swiper-slide">
      <div class="slide-content">
        <h2 class="slide-title">Slide 3</h2>
        <p class="slide-description">Description for slide 3</p>
        <button class="slide-button">Learn More</button>
      </div>
    </div>
    
  </div>
</div>
```

### Targeting Specific Carousel Instances

If you have multiple carousels, scope your CSS to specific instances:

```css
/* Only target hero carousel */
[data-slider-instance="hero"] .swiper-slide[data-state="active"] .slide-title {
  opacity: 1;
  transform: translateY(0);
}

/* Only target testimonials carousel */
[data-slider-instance="testimonials"] .swiper-slide[data-state="active"] .quote {
  opacity: 1;
  transform: scale(1);
}
```

## Why Not IX3?

**IX3 Limitation**: Webflow's IX3 system does not re-trigger animations when element attributes (like `data-state`) change. IX3 only works on:
- Initial page load
- Custom events emitted to the IX3 system
- User interactions (click, hover, scroll)

**The Problem**: When a slide's `data-state` changes from `inactive` to `active`, IX3 animations targeting `[data-state="active"]` will not trigger because IX3 doesn't watch for attribute changes.

**The Solution**: Use CSS transitions and animations, which automatically respond to attribute changes and provide better performance.

## Benefits of CSS Approach

1. **Works Reliably**: CSS responds to attribute changes automatically
2. **Better Performance**: GPU-accelerated, no JavaScript overhead
3. **Easier to Maintain**: All animation logic in one place
4. **No IX3 Limitations**: Works with Swiper's dynamic DOM updates
5. **Smoother Animations**: Native browser optimizations
6. **Webflow Compatible**: Add CSS via Embed element or custom code

## Adding CSS in Webflow

1. Add an **Embed** element to your page
2. Wrap your CSS in `<style>` tags:

```html
<style>
.swiper-slide {
  opacity: 0.3;
  transform: scale(0.9);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.swiper-slide[data-state="active"] {
  opacity: 1;
  transform: scale(1);
}

.swiper-slide[data-state="active"] .slide-title {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.1s;
}
</style>
```

3. Publish and test

## Advanced: CSS Animations (Keyframes)

For more complex animations, use CSS keyframes:

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.swiper-slide[data-state="active"] .slide-title {
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.swiper-slide[data-state="active"] .slide-description {
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
}

.swiper-slide[data-state="active"] .slide-button {
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
}
```
