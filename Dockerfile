# LifeOS Health backend (Spring Boot) container.
# Used by Render (see render.yaml) and runnable on any Docker host.
# The React frontend in this repo is deployed separately on Vercel and is
# deliberately excluded from the image (see .dockerignore).

# ---- Build stage -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Resolve dependencies first so code-only changes reuse the cached layer.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src/main ./src/main
# Tests run in GitHub Actions (.github/workflows/ci.yml) against a real Postgres,
# so the image build only compiles and packages.
RUN mvn -B -q -DskipTests package \
 && cp target/lifeos-backend-*.jar /app/app.jar

# ---- Runtime stage -----------------------------------------------------------
FROM eclipse-temurin:21-jre

# Run as an unprivileged user, never root.
RUN groupadd --system lifeos && useradd --system --gid lifeos --no-create-home lifeos
WORKDIR /app
COPY --from=build /app/app.jar /app/app.jar
USER lifeos

# Memory settings tuned for a 512 MB container (Render free tier):
#  - heap capped at 55% of the container so metaspace, threads and native
#    buffers fit in the rest
#  - SerialGC has the smallest footprint for a single small instance
#  - exit on OOM so the platform restarts a clean process instead of a sick one
# Override with JAVA_TOOL_OPTIONS on a larger plan.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=55 -XX:+UseSerialGC -Xss512k -XX:MaxMetaspaceSize=150m -XX:ReservedCodeCacheSize=48m -XX:+ExitOnOutOfMemoryError"

# The app listens on 8080 (render.yaml sets PORT=8080 so Render routes there).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
