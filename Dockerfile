FROM meltano/meltano:latest
RUN meltano init test
WORKDIR test
