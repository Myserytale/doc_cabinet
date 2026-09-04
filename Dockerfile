# Multi-stage production build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle

# Pre-fetch dependencies
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and static assets
COPY src ./src

# Build production executable JAR
RUN ./gradlew bootJar -x test --no-daemon

# Minimal production runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl \
    && addgroup -S docvault && adduser -S docvault -G docvault

COPY --from=builder /workspace/build/libs/server-0.0.1-SNAPSHOT.jar app.jar
RUN chown -R docvault:docvault /app

USER docvault

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
