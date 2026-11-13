# Portfolio server

## Configuration

Set these variables in the server's environment (or in a local `.env` file):

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `ADMIN_KEY` | Yes | Secret entered in the timeline's admin form and sent as a Bearer token for write requests. |
| `GITHUB_TOKEN` | For image uploads | GitHub token with Contents read/write access to the image repository. Keep this value on the server; do not add it to the frontend. |
| `GITHUB_REPOSITORY` | For image uploads* | Repository in `owner/name` format. |
| `GITHUB_OWNER` and `GITHUB_REPO` | For image uploads* | Alternative to `GITHUB_REPOSITORY`. |
| `GITHUB_BRANCH` | No | Branch to receive image commits. Defaults to `main`. |
| `GITHUB_IMAGE_DIRECTORY` | No | Repository directory for uploaded images. Defaults to `public/images/projects`. |
| `PORT` | No | Listening port. Defaults to `3001`. |

*Set `GITHUB_TOKEN` and either `GITHUB_REPOSITORY` or both `GITHUB_OWNER` and `GITHUB_REPO`. The repository must be public for its returned raw image URLs to load in the portfolio.

The image endpoint accepts JPEG, PNG, GIF, WebP, or AVIF images up to 5 MB. Admin requests use `Authorization: Bearer <ADMIN_KEY>`.

Run locally with `node index.js`.
