

## Make Hydra Guard a Collapsible Sub-menu in the Sidebar

### What changes

**`src/components/admin/AdminSidebar.tsx`** — Restructure the Tools group so "Hydra Guard" is a single collapsible parent item with sub-items (Detections, Corrections, Patterns, Reports). Uses the existing `SidebarMenuSub`, `SidebarMenuSubItem`, and `SidebarMenuSubButton` components from the Shadcn sidebar, plus `Collapsible` from Radix for expand/collapse behavior.

The sidebar Tools section will look like:

```text
Tools
  POD Pipeline
  Hydra Guard  ▸
    Detections
    Corrections
    Patterns
    User Reports
System
  Settings
```

### Technical approach

1. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` and the `SidebarMenuSub*` components
2. Keep POD Pipeline as a normal menu item in Tools
3. Add Hydra Guard as a `Collapsible` menu item with a `CollapsibleTrigger` (shows Shield icon + "Hydra Guard" + chevron)
4. Inside `CollapsibleContent`, render `SidebarMenuSub` with the four sub-items using `SidebarMenuSubButton` + `Link`
5. Auto-expand when any `/admin/security/*` route is active using `defaultOpen`
6. Single file change — no routing or other file modifications needed

