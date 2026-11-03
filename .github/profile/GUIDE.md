# Profile themes

The repository root contains only `README.md` and `.github/` (excluding Git metadata).
The README remains the content source: edit it directly, without a separate template.

## Change the theme on GitHub

After pushing these files to `main`, open **Actions → Change theme → Run workflow**.
Choose a theme and run the workflow. It updates the README, active banner and logo,
then commits the changes to the selected branch.
Your choice is saved in `settings.theme` and preserved by daily runs.
Choose `auto` to enable the calendar again. No additional secrets are required.
Branch protection rules must allow commits from GitHub Actions.

## Run locally

Requires Node.js 24 or later, with no dependencies to install:

```sh
node .github/profile/theme.mjs --theme winter
node .github/profile/theme.mjs --theme auto
node .github/profile/theme.mjs --date 2027-03-28
node --test .github/profile/theme.test.mjs
```

`--theme` saves the selected mode. Without this argument, the script keeps the saved
mode. `--date` simulates a date in automatic mode; it also writes the active files,
so run the script again without a date after a simulation.
The initial mode is `halloween` to preserve the appearance of the supplied README.

## Configuration and images

- `themes.json`: colors, files, current selection and calendar.
- `theme.mjs`: theme selection and application.
- `theme.test.mjs`: checks for calendar behavior, assets and preserved content.
- `assets/banners/` and `assets/logos/`: source images for all 14 themes.
- `assets/banner.svg` and `assets/logo.svg`: copies of the active theme.
- `../workflows/seasonal-theme.yml`: GitHub Actions workflow.

The theme applies to the banner, active logo, typing animation, social badges,
technology badges, repository button and Skill Icons light/dark mode.
The white logos on social badges are preserved.
The active logo is available for reuse; it is not added to the README because
 the supplied version does not display it. The workflow does not change the GitHub avatar.
Skill Icons SVGs are provided by the external service and support only `dark` or
`light`, through `iconTheme`.

Each theme defines `color` (accent), `background` (badge background), `iconTheme`,
`banner`, `logo`, `label` and `event`. Colors are hexadecimal values without `#`.
The autumn images are palette variants of the existing spring SVGs.
To add a theme, add its SVGs, JSON entry and workflow option.

In automatic mode, `settings.priority` defines the selection order: events,
campaigns, then seasons. By default, events start six days before their date and
end on the day itself; `daysBefore` and `daysAfter` customize each event's window.
A higher numeric priority takes precedence when events overlap.
Campaigns and seasons use their exact date ranges, including both boundaries.
Easter is calculated each year, and winter includes February 29.

The workflow runs daily at 12:00 in the `Europe/Paris` timezone, automatically
following daylight saving time, and after relevant changes on `main`.
The engine uses the date in Paris. The README banner points directly to the
selected theme's source SVG using a relative path, so it follows the displayed
branch and cannot remain pinned to an old commit or another theme's active copy.
The same rule applies to the logo if it is included in the README.
Use `main` to update the public profile.
