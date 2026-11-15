# UNTESTED TEMPLATE. Build stage runs the full regression suite; the image exists only if every test passes.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN java Build.java test

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --no-create-home cellar && mkdir /data && chown cellar /data
COPY --from=build /src/dist/cellar.jar /app/cellar.jar
USER 10001
ENV CELLAR_BIND=0.0.0.0 CELLAR_PORT=8080 CELLAR_DATA=/data CELLAR_TRUST_PROXY=true
EXPOSE 8080
VOLUME /data
ENTRYPOINT ["java","-XX:+ExitOnOutOfMemoryError","-Xmx512m","-jar","/app/cellar.jar","web"]
