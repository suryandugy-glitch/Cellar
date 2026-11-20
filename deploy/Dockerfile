FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY Build.java ./
COPY src/ src/
RUN java Build.java test

FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home cellar \
    && install -d -m 0700 -o cellar /data
COPY --from=build /src/dist/cellar.jar /app/cellar.jar
USER 10001
ENV CELLAR_BIND=0.0.0.0 CELLAR_PORT=8080 CELLAR_DATA=/data CELLAR_TRUST_PROXY=true
EXPOSE 8080
VOLUME /data
ENTRYPOINT ["java","-XX:+ExitOnOutOfMemoryError","-Xmx512m","-jar","/app/cellar.jar","web"]
