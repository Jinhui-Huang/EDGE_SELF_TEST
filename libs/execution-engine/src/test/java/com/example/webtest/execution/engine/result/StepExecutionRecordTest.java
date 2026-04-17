package com.example.webtest.execution.engine.result;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.webtest.artifact.model.ArtifactRef;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class StepExecutionRecordTest {
    @Test
    void addArtifactPromotesRelatedArtifactsIntoStepArtifactList() {
        ArtifactRef network = artifact("network", Path.of("run", "step-network.json"));
        ArtifactRef requestBody = artifact("network-request-body", Path.of("run", "step-network-bodies", "request.txt"));
        ArtifactRef responseBody = artifact("network-response-body", Path.of("run", "step-network-bodies", "response.txt"));
        network.setRelatedArtifacts(List.of(requestBody, responseBody));

        StepExecutionRecord record = new StepExecutionRecord();
        record.addArtifact(network);

        assertEquals(Path.of("run", "step-network.json"), record.getArtifactPath());
        assertEquals(3, record.getArtifacts().size());
        assertEquals("network", record.getArtifacts().get(0).getType());
        assertEquals("network-request-body", record.getArtifacts().get(1).getType());
        assertEquals("network-response-body", record.getArtifacts().get(2).getType());
    }

    private ArtifactRef artifact(String type, Path path) {
        ArtifactRef ref = new ArtifactRef();
        ref.setType(type);
        ref.setPath(path);
        ref.setContentType("text/plain");
        return ref;
    }
}
