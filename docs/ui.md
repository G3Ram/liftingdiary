# UI Coding Standards

This document outlines the UI coding standards for the liftingdiary project. **All developers must strictly adhere to these guidelines.**

## Component Library

### shadcn/ui Components

**CRITICAL RULE: ONLY shadcn/ui components shall be used for all UI elements in this project.**

- ✅ **DO**: Use shadcn/ui components for all UI needs
- ❌ **DO NOT**: Create custom UI components
- ❌ **DO NOT**: Use other component libraries (e.g., Material-UI, Ant Design, Chakra UI)
- ❌ **DO NOT**: Build custom implementations of common UI patterns (buttons, inputs, dialogs, etc.)

### Component Usage

When you need a UI element:

1. **First**: Check if a shadcn/ui component exists for your use case
2. **Install**: Add the shadcn/ui component to your project using the CLI:
   ```bash
   npx shadcn@latest add [component-name]
   ```
3. **Use**: Import and use the shadcn/ui component directly
4. **Never**: Create a custom alternative

### Example

```tsx
// ✅ CORRECT - Using shadcn/ui Button
import { Button } from "@/components/ui/button"

export function MyComponent() {
  return <Button variant="default">Click me</Button>
}

// ❌ WRONG - Creating custom button component
export function CustomButton({ children, ...props }) {
  return (
    <button className="custom-styles" {...props}>
      {children}
    </button>
  )
}
```

## Date Formatting

### Library

**All date formatting must be done using `date-fns`.**

- ✅ **DO**: Use date-fns for all date formatting
- ❌ **DO NOT**: Use native JavaScript date methods for display formatting
- ❌ **DO NOT**: Use other date libraries (e.g., moment.js, dayjs, luxon)

### Standard Format

Dates must be formatted in the following pattern:

```
1st Sep 2025
2nd Aug 2025
3rd Jan 2026
4th Jun 2024
```

**Format breakdown:**
- Day with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
- Abbreviated month name (Jan, Feb, Mar, etc.)
- Full 4-digit year

### Implementation

Use the `format` function from `date-fns` with the pattern `do MMM yyyy`:

```tsx
import { format } from 'date-fns'

// ✅ CORRECT
const formattedDate = format(new Date(), 'do MMM yyyy')
// Output: "13th Feb 2026"

// ❌ WRONG - Using native methods
const wrongDate = date.toLocaleDateString()

// ❌ WRONG - Different format
const wrongFormat = format(new Date(), 'MM/DD/YYYY')
```

### Example Component

```tsx
import { format } from 'date-fns'

interface WorkoutDateProps {
  date: Date
}

export function WorkoutDate({ date }: WorkoutDateProps) {
  return (
    <time dateTime={date.toISOString()}>
      {format(date, 'do MMM yyyy')}
    </time>
  )
}
```

## Enforcement

These standards are **mandatory** and non-negotiable. Code reviews must enforce:

1. No custom UI components are present in the codebase
2. All UI elements use shadcn/ui components
3. All date displays use date-fns with the `do MMM yyyy` format

Any pull requests violating these standards will be rejected.

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [date-fns Documentation](https://date-fns.org/)
- [date-fns format patterns](https://date-fns.org/docs/format)