# ── Stage 1: Build Quarkus fast-jar with Maven & JDK 21 ───────────────────────
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /workspace

# Cache Maven dependencies first
COPY pom.xml ./
RUN mvn -B --no-transfer-progress -P-generate-jwt-keys dependency:go-offline || true

# Copy source and build Quarkus fast-jar (skipping dev keygen so no private key is baked into the image)
COPY src ./src
RUN mvn -B --no-transfer-progress -P-generate-jwt-keys -DskipTests package

# ── Stage 2: Minimal JRE 21 runtime image ─────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /workspace/target/quarkus-app/lib/ /app/lib/
COPY --from=build /workspace/target/quarkus-app/*.jar /app/
COPY --from=build /workspace/target/quarkus-app/app/ /app/app/
COPY --from=build /workspace/target/quarkus-app/quarkus/ /app/quarkus/
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Normalize line endings (in case built from Windows) and make executable
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && chmod +x /app/docker-entrypoint.sh \
    && useradd --create-home --shell /bin/sh appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8081

# Default JWT key paths generated on startup when not mounted externally
ENV SMALLRYE_JWT_SIGN_KEY_LOCATION=file:/tmp/jwt/privateKey.pem \
    MP_JWT_VERIFY_PUBLICKEY_LOCATION=file:/tmp/jwt/publicKey.pem

HEALTHCHECK --interval=10s --timeout=5s --start-period=25s --retries=8 \
    CMD curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/auth | grep -qE "^[234]" || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
