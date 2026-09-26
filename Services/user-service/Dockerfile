FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -DskipTests dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && groupadd --system app && useradd --system --gid app --home /app app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/target/*.jar app.jar
USER app
EXPOSE 8082
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport -Djava.io.tmpdir=/tmp"
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 CMD curl --fail --silent http://127.0.0.1:8082/actuator/health/readiness || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
