import { execCommand, parseByteValue, parseDate, processKeyValueString } from "./utils";

export type PortMapping = {
    /** If listening on the host is bound to a particular hostname or ip. If not present all interfaces are accepted. */
    hostAddress?: string;

    /** Source port on the host to listen at. */
    hostPort: number;

    /** Port inside the container to forward to. */
    containerPort: number;

    /** Protocol that is mapped. */
    protocol: 'tcp' | 'udp';
};

export type DockerContainer = {

    /** Command running in the container. */
    cmd: string;

    /** Date when the container was created. */
    createdAt: Date;

    /** ID of the container. */
    containerId: string;

    /** Name or ID of the image used by the container. */
    image: string;

    /** Labels assigned to the container. */
    labels: {[key: string]: any};

    /** Number of local volumes attached to the container. */
    localVolumeCount: number;

    /** Local directories or volume names mounted into the container. */
    mounts: string[];

    /** Name of the container. */
    name: string;

    /** Names of the networks the container is attached to. */
    networks: string[];

    /** Exposed ports for network traffic. */
    ports: PortMapping[];

    /** Humand-readable string when the container has been cretated. */
    runningForMessage: string;

    /** Disk size the container utilized in bytes. */
    size: number;

    /** Virtual size of the container, if available. */
    virtualSize?: number;

    /**
     * State of the container. Possible values are:
     * - 'created': The container has been created but not started.
     * - 'restarting': The container is restarting.
     * - 'running': The container is currently running.
     * - 'removing': The container is being removed.
     * - 'paused': The container is paused.
     * - 'exited': The container has exited.
     * - 'dead': The container is dead and cannot be restarted.
     */
    state: 'created' | 'restarting' | 'running' | 'removing' | 'paused' | 'exited' | 'dead';

    /** Human-readable string describing the current status of the container. */
    statusMessage: string;

    /** Health state of the container if provided. */
    healthState?: 'starting' | 'healthy' | 'unhealthy';

    /** Whether the container is currently running. */
    isRunning: boolean;

    /** Whether the container is healthy. Only false if not running or unhealthy. */
    isHealthy: boolean;
};


export async function getDockerContainers(includeStopped: boolean = false): Promise<DockerContainer[]> {
    return await execCommand(
        'docker ps --format json --no-trunc' + (includeStopped ? ' -a' : ''),
    ).then(output => {
        // Docker has a custom format with one JSON object per line
        return output.split('\n').filter(line => line.trim() !== '').map<DockerContainer>(line => {
            const j = JSON.parse(line);

            // post-process dates
            if(j.CreatedAt && typeof j.CreatedAt === 'string'){
                j.CreatedAt = parseDate(j.CreatedAt) || j.CreatedAt;
            }

            // post-process labels
            if(j.Labels && typeof j.Labels === 'string') {
                j.Labels = processKeyValueString(j.Labels, ',', '=');
            }

            // post-process local volumes
            if(j.LocalVolumes && typeof j.LocalVolumes === 'string') {
                j.LocalVolumes = parseInt(j.LocalVolumes, 10);
                j.LocalVolumes = Number.isNaN(j.LocalVolumes) ? j.LocalVolumes : j.LocalVolumes;
            }

            // post-process mounts
            if(j.Mounts && typeof j.Mounts === 'string') {
                j.Mounts = (j.Mounts as string).split(',').map(mount => mount.trim());
            }

            // post-process networks
            if(j.Networks && typeof j.Networks === 'string') {
                j.Networks = (j.Networks as string).split(',').map(network => network.trim());
            }

            // post-process ports
            if(j.Ports && typeof j.Ports === 'string') {
                const portMappings: PortMapping[] = [];
                (j.Ports as string).split(',').forEach(str => {
                    const [mapping, protocol = 'tcp'] = str.split('/');
                    const [host, containerPortStr] = mapping.split('->');
                    const containerPort: number = parseInt(containerPortStr, 10);
                    const hostIdx = host.lastIndexOf(':');
                    let hostPort: number = containerPort;
                    let hostAddress: string | undefined = undefined;
                    if(hostIdx > 0){
                        hostPort = parseInt(host.substring(hostIdx + 1), 10);
                        hostAddress = host.substring(0, hostIdx);
                        hostAddress = (hostAddress && hostAddress !== '0.0.0.0' && hostAddress !== '::') ? hostAddress : undefined;
                    } else {
                        hostPort = parseInt(host, 10);
                    }
                    const pm: PortMapping = { hostAddress, hostPort, containerPort, protocol: protocol as 'tcp' | 'udp' };

                    // check if port mapping already exists
                    const alreadyExists = portMappings.some(o =>
                        o.hostAddress === pm.hostAddress &&
                        o.hostPort === pm.hostPort &&
                        o.containerPort === pm.containerPort &&
                        o.protocol === pm.protocol
                    );
                    if(!alreadyExists) portMappings.push(pm);
                });
                j.Ports = portMappings;
            }

            // post-process size
            if(j.Size && typeof j.Size === 'string') {
                const idx = (j.Size as string).indexOf('irtual');
                if(idx > 0) {
                    j.VirtualSize = parseByteValue((j.Size as string).substring(idx + 6));
                }
                j.Size = parseByteValue((j.Size as string));
            }

            // post-process status
            if(j.Status && typeof j.Status === 'string'){
                if((j.Status as string).includes('unhealthy')){
                    j.HealthState = 'unhealthy';
                } else if((j.Status as string).includes('healthy')){
                    j.HealthState = 'healthy';
                } else if((j.Status as string).includes('starting')){
                    j.HealthState = 'starting';
                }
            }

            const containerInfo: DockerContainer = {
                cmd: j.Command,
                createdAt: j.CreatedAt,
                containerId: j.ID,
                image: j.Image,
                labels: j.Labels || {},
                localVolumeCount: j.LocalVolumes || 0,
                mounts: j.Mounts || [],
                name: j.Names,
                networks: j.Networks || [],
                ports: j.Ports || [],
                runningForMessage: j.RunningFor || '',
                size: j.Size || 0,
                state: j.State,
                statusMessage: j.Status,
                isRunning: (j.State === 'running'),
                isHealthy: (j.HealthState === 'healthy' || (j.State === 'running' && !j.HealthState)),
            };
            if(j.HealthState) containerInfo.healthState = j.HealthState;
            if(j.VirtualSize) containerInfo.virtualSize = j.VirtualSize;
            return containerInfo;
        });
    }).catch(() => []);
}