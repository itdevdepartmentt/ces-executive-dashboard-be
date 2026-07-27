export declare function calculateOcaFcrRealisasi(data: {
    eskalasiAm: string;
    description: string;
    idRemedyNo: string;
    reasonOsl: string;
    countInboundMessage: number;
    inSla: boolean;
    msisdn?: string;
    subCategory?: string;
    detailCategory?: string;
}): {
    isFcrRealisasi: boolean;
    eskalasiRealisasiTarget: string | null;
};
