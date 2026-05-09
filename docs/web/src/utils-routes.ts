import {
  AppRoute,
  AppRouteNavChild,
  pageRoute,
  PageRouteNav,
} from "@abeyjs/view";

const children: AppRouteNavChild[] = [
  {
    path: `/abey-table`,
    label: "abey-table",
    navIconFa: "fa-solid fa-table",
  },
  {
    path: `/students`,
    label: "Students",
    navIconFa: "fa-solid fa-graduation-cap",
  },
];

export function getUtilsRoutes(): AppRoute {
  return pageRoute(
    "/utils",
    {
      label: "Utils",
      title: "abey-table · AbeyJs Docs",
      showInNav: true,
      navChildren: children,
      navIconFa: "fa-solid fa-tools",
    } satisfies PageRouteNav,
    { heading: "abey-table", lead: "Abey Table" },
  );
}
