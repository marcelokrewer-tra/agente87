import * as XLSX from 'xlsx';

export interface SellOutRecord {
  id: string;
  cliente: string;
  coordenador: string;
  linha: string; // 'GERAL' | 'TRAMONTINA MULTI' | 'TRAMONTINA MASTER' | 'TRAMONTINA PRO'
  ano: number;
  meses: {
    janeiro: number;
    fevereiro: number;
    marco: number;
    abril: number;
    maio: number;
    junho: number;
    julho: number;
    agosto: number;
    setembro: number;
    outubro: number;
    novembro: number;
    dezembro: number;
  };
}

export const MONTH_KEYS = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
] as const;

export const MONTH_NAMES_PT = [
  { key: 'janeiro', label: 'Janeiro', short: 'Jan', num: 1 },
  { key: 'fevereiro', label: 'Fevereiro', short: 'Fev', num: 2 },
  { key: 'marco', label: 'Março', short: 'Mar', num: 3 },
  { key: 'abril', label: 'Abril', short: 'Abr', num: 4 },
  { key: 'maio', label: 'Maio', short: 'Mai', num: 5 },
  { key: 'junho', label: 'Junho', short: 'Jun', num: 6 },
  { key: 'julho', label: 'Julho', short: 'Jul', num: 7 },
  { key: 'agosto', label: 'Agosto', short: 'Ago', num: 8 },
  { key: 'setembro', label: 'Setembro', short: 'Set', num: 9 },
  { key: 'outubro', label: 'Outubro', short: 'Out', num: 10 },
  { key: 'novembro', label: 'Novembro', short: 'Nov', num: 11 },
  { key: 'dezembro', label: 'Dezembro', short: 'Dez', num: 12 }
] as const;

// Default full dataset containing all 15 clients for 2025 and 2026
export const INITIAL_SELL_OUT_CSV = `CLIENTE;SELL OUT;ANO;JANEIRO;FEVEREIRO;MARÇO;ABRIL;MAIO;JUNHO;JULHO;AGOSTO;SETEMBRO;OUTUBRO;NOVEMBRO;DEZEMBRO
MERCANTE;GERAL;2025;R$ 1.542.067;R$ 945.354;R$ 1.831.517;R$ 725.631;R$ 1.386.212;R$ 499.243;R$ 1.352.921;R$ 929.389;R$ 1.073.000;R$ 1.671.000;R$ 1.280.256;R$ 1.118.882
MERCANTE;TRAMONTINA MULTI;2025;R$ 1.261.157;R$ 798.013;R$ 1.622.663;R$ 557.892;R$ 1.238.470;R$ 419.666;R$ 1.041.958;R$ 772.228;R$ 910.000;R$ 1.536.000;R$ 1.089.134;R$ 989.127
MERCANTE;TRAMONTINA MASTER;2025;R$ 280.910;R$ 147.341;R$ 208.854;R$ 167.739;R$ 147.742;R$ 79.577;R$ 310.963;R$ 157.161;R$ 163.000;R$ 135.000;R$ 191.122;R$ 129.755
MERCANTE;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
IDB;GERAL;2025;R$ 603.763;R$ 559.100;R$ 560.194;R$ 532.616;R$ 644.128;R$ 429.235;R$ 678.073;R$ 584.437;R$ 667.895;R$ 769.500;R$ 906.891;R$ 346.405
IDB;TRAMONTINA MULTI;2025;R$ 469.724;R$ 458.696;R$ 423.398;R$ 395.010;R$ 476.994;R$ 337.120;R$ 491.675;R$ 431.958;R$ 531.773;R$ 638.840;R$ 795.922;R$ 255.656
IDB;TRAMONTINA MASTER;2025;R$ 134.039;R$ 100.404;R$ 136.796;R$ 137.606;R$ 167.134;R$ 92.115;R$ 186.398;R$ 152.479;R$ 136.122;R$ 130.660;R$ 110.969;R$ 90.749
IDB;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
ALMEIDA;GERAL;2025;R$ 1.528.000;R$ 1.139.000;R$ 1.068.000;R$ 1.421.000;R$ 1.340.000;R$ 1.305.000;R$ 1.410.000;R$ 1.311.000;R$ 1.849.414;R$ 1.331.886;R$ 1.284.267;R$ 1.282.026
ALMEIDA;TRAMONTINA MULTI;2025;R$ 1.262.000;R$ 917.000;R$ 905.000;R$ 1.249.000;R$ 1.172.000;R$ 1.120.000;R$ 1.218.000;R$ 1.113.000;R$ 1.702.000;R$ 1.196.194;R$ 1.060.988;R$ 1.094.944
ALMEIDA;TRAMONTINA MASTER;2025;R$ 266.000;R$ 222.000;R$ 163.000;R$ 172.000;R$ 168.000;R$ 185.000;R$ 192.000;R$ 198.000;R$ 147.414;R$ 135.692;R$ 223.279;R$ 187.082
ALMEIDA;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
DANTAS;GERAL;2025;R$ 416.922;R$ 223.089;R$ 117.247;R$ 196.838;R$ 206.559;R$ 106.423;R$ 193.211;R$ 106.881;R$ 112.277;R$ 198.801;R$ 176.444;R$ 152.303
DANTAS;TRAMONTINA MULTI;2025;R$ 356.622;R$ 169.529;R$ 84.495;R$ 157.483;R$ 156.526;R$ 73.940;R$ 160.375;R$ 85.594;R$ 90.712;R$ 161.102;R$ 125.467;R$ 95.344
DANTAS;TRAMONTINA MASTER;2025;R$ 60.300;R$ 53.560;R$ 32.752;R$ 39.355;R$ 50.033;R$ 32.483;R$ 32.836;R$ 21.287;R$ 21.565;R$ 37.699;R$ 50.977;R$ 56.959
DANTAS;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
MR;GERAL;2025;R$ 450.668;R$ 362.350;R$ 405.520;R$ 400.178;R$ 870.315;R$ 518.550;R$ 565.489;R$ 1.072.348;R$ 537.773;R$ 595.168;R$ 457.348;R$ 333.975
MR;TRAMONTINA MULTI;2025;R$ 370.814;R$ 310.924;R$ 336.109;R$ 342.610;R$ 811.205;R$ 461.583;R$ 507.127;R$ 1.014.806;R$ 453.672;R$ 517.968;R$ 389.750;R$ 284.248
MR;TRAMONTINA MASTER;2025;R$ 79.854;R$ 51.426;R$ 69.411;R$ 57.568;R$ 59.110;R$ 56.967;R$ 58.362;R$ 57.542;R$ 84.101;R$ 77.200;R$ 67.598;R$ 49.727
MR;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
LDF;GERAL;2025;R$ 718.664;R$ 853.808;R$ 622.860;R$ 498.275;R$ 450.796;R$ 443.422;R$ 518.909;R$ 584.057;R$ 805.789;R$ 880.742;R$ 433.588;R$ 492.726
LDF;TRAMONTINA MULTI;2025;R$ 647.619;R$ 798.705;R$ 519.684;R$ 415.188;R$ 353.989;R$ 355.311;R$ 400.351;R$ 507.676;R$ 721.588;R$ 807.685;R$ 392.775;R$ 426.199
LDF;TRAMONTINA MASTER;2025;R$ 71.045;R$ 55.103;R$ 103.176;R$ 83.087;R$ 96.807;R$ 88.111;R$ 118.558;R$ 76.381;R$ 84.201;R$ 73.057;R$ 40.813;R$ 66.527
LDF;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
AM;GERAL;2025;R$ 564.913;R$ 569.446;R$ 602.321;R$ 907.967;R$ 538.079;R$ 703.035;R$ 753.360;0;0;0;0;0
AM;TRAMONTINA MULTI;2025;R$ 422.050;R$ 440.937;R$ 444.246;R$ 703.225;R$ 389.585;R$ 556.329;R$ 553.831;0;0;0;0;0
AM;TRAMONTINA MASTER;2025;R$ 142.863;R$ 128.509;R$ 158.075;R$ 204.742;R$ 148.494;R$ 146.706;R$ 199.529;0;0;0;0;0
AM;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
ABREU;GERAL;2025;R$ 1.549.481;R$ 1.498.749;R$ 1.118.498;R$ 1.193.905;R$ 1.193.905;R$ 1.545.007;R$ 1.621.936;0;0;0;0;0
ABREU;TRAMONTINA MULTI;2025;R$ 1.201.512;R$ 1.141.264;R$ 844.314;R$ 885.605;R$ 885.605;R$ 1.222.000;R$ 1.035.333;0;0;0;0;0
ABREU;TRAMONTINA MASTER;2025;R$ 347.969;R$ 357.485;R$ 274.184;R$ 308.300;R$ 308.300;R$ 323.007;R$ 586.603;0;0;0;0;0
ABREU;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
TOLEDO;GERAL;2025;R$ 393.684;R$ 226.877;R$ 264.374;R$ 362.373;R$ 294.744;R$ 217.434;R$ 224.823;0;0;0;0;0
TOLEDO;TRAMONTINA MULTI;2025;R$ 346.208;R$ 179.047;R$ 214.666;R$ 293.868;R$ 232.895;R$ 165.825;R$ 164.152;0;0;0;0;0
TOLEDO;TRAMONTINA MASTER;2025;R$ 47.476;R$ 47.830;R$ 49.708;R$ 68.505;R$ 61.849;R$ 51.609;R$ 60.671;0;0;0;0;0
TOLEDO;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
MAIA;GERAL;2025;R$ 640.551;R$ 496.591;R$ 457.819;R$ 555.699;R$ 610.997;R$ 661.105;R$ 1.184.437;R$ 805.791;R$ 881.950;R$ 1.099.890;R$ 769.222;R$ 571.438
MAIA;TRAMONTINA MULTI;2025;R$ 369.502;R$ 291.810;R$ 265.126;R$ 325.301;R$ 405.994;R$ 434.939;R$ 802.000;R$ 580.000;R$ 634.037;0;R$ 520.482;R$ 377.088
MAIA;TRAMONTINA MASTER;2025;R$ 271.049;R$ 204.781;R$ 192.693;R$ 230.398;R$ 205.003;R$ 226.166;R$ 382.437;R$ 225.791;R$ 247.913;0;R$ 248.740;R$ 194.350
MAIA;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
NILO MAIA;GERAL;2025;R$ 1.344.820;R$ 1.034.919;R$ 1.058.500;R$ 1.172.199;R$ 1.124.254;R$ 1.114.590;R$ 1.100.598;R$ 1.294.411;R$ 1.411.313;R$ 1.700.159;R$ 1.097.975;R$ 1.071.780
NILO MAIA;TRAMONTINA MULTI;2025;R$ 1.001.491;R$ 747.981;R$ 730.302;R$ 869.103;R$ 752.701;R$ 722.435;R$ 711.241;R$ 890.925;R$ 1.040.183;R$ 1.310.296;R$ 824.142;R$ 755.713
NILO MAIA;TRAMONTINA MASTER;2025;R$ 343.330;R$ 286.938;R$ 328.198;R$ 303.096;R$ 371.554;R$ 392.156;R$ 389.357;R$ 403.486;R$ 371.130;R$ 389.863;R$ 273.833;R$ 316.067
NILO MAIA;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
RAMACON;GERAL;2025;R$ 178.144;R$ 179.678;R$ 142.622;R$ 202.154;R$ 412.290;R$ 144.046;R$ 227.782;R$ 178.594;R$ 193.720;R$ 249.275;R$ 153.214;R$ 145.495
RAMACON;TRAMONTINA MULTI;2025;R$ 132.982;R$ 133.010;R$ 99.051;R$ 152.730;R$ 290.721;R$ 100.831;R$ 156.004;R$ 127.407;R$ 143.658;R$ 183.571;R$ 106.222;R$ 99.855
RAMACON;TRAMONTINA MASTER;2025;R$ 45.162;R$ 46.668;R$ 43.571;R$ 49.424;R$ 121.569;R$ 43.215;R$ 71.778;R$ 51.187;R$ 50.062;R$ 65.704;R$ 46.992;R$ 45.640
RAMACON;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
DISTAC;GERAL;2025;R$ 935.119;R$ 779.064;R$ 797.531;R$ 906.734;R$ 860.715;R$ 730.829;R$ 895.185;R$ 751.577;R$ 823.368;R$ 1.261.183;R$ 1.013.726;R$ 635.529
DISTAC;TRAMONTINA MULTI;2025;R$ 527.129;R$ 467.396;R$ 400.077;R$ 536.961;R$ 467.521;R$ 426.065;R$ 491.671;R$ 423.034;R$ 453.624;R$ 684.404;R$ 687.053;R$ 386.817
DISTAC;TRAMONTINA MASTER;2025;R$ 407.990;R$ 311.668;R$ 397.454;R$ 369.773;R$ 393.194;R$ 304.764;R$ 403.514;R$ 328.543;R$ 369.744;R$ 576.779;R$ 326.673;R$ 248.712
DISTAC;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
LAMPADINHA;GERAL;2025;R$ 652.519;R$ 452.914;R$ 503.541;R$ 561.474;R$ 639.129;R$ 414.342;R$ 521.203;R$ 768.026;R$ 513.864;R$ 677.068;R$ 663.050;R$ 371.378
LAMPADINHA;TRAMONTINA MULTI;2025;R$ 499.729;R$ 318.327;R$ 371.253;R$ 424.498;R$ 496.515;R$ 288.019;R$ 358.436;R$ 607.651;R$ 379.125;R$ 502.000;R$ 510.153;R$ 214.334
LAMPADINHA;TRAMONTINA MASTER;2025;R$ 152.790;R$ 134.587;R$ 132.288;R$ 136.976;R$ 142.614;R$ 126.323;R$ 162.767;R$ 160.375;R$ 134.739;R$ 175.068;R$ 152.897;R$ 157.044
LAMPADINHA;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
JORGE BATISTA;GERAL;2025;R$ 79.102;R$ 51.540;R$ 100.902;R$ 41.956;R$ 94.381;R$ 42.952;R$ 83.465;R$ 103.204;R$ 95.041;R$ 46.804;R$ 106.813;R$ 41.619
JORGE BATISTA;TRAMONTINA MULTI;2025;0;0;0;0;0;0;0;0;0;0;0;0
JORGE BATISTA;TRAMONTINA MASTER;2025;0;0;0;0;0;0;0;0;0;0;0;0
JORGE BATISTA;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
MERCANTE;GERAL;2026;R$ 1.704.053;R$ 731.000;R$ 1.264.321;R$ 736.109;R$ 1.681.193;R$ 760.805;R$ 1.839.711;0;0;0;0;0
MERCANTE;TRAMONTINA MULTI;2026;R$ 1.467.804;R$ 609.000;R$ 1.089.174;R$ 614.000;R$ 1.522.809;R$ 633.332;R$ 1.635.000;0;0;0;0;0
MERCANTE;TRAMONTINA MASTER;2026;R$ 236.249;R$ 122.000;R$ 175.147;R$ 122.109;R$ 158.384;R$ 127.473;R$ 204.711;0;0;0;0;0
MERCANTE;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
IDB;GERAL;2026;R$ 544.151;R$ 427.501;R$ 539.311;R$ 492.166;R$ 596.141;R$ 564.838;R$ 788.190;0;0;0;0;0
IDB;TRAMONTINA MULTI;2026;R$ 416.892;R$ 351.922;R$ 437.096;R$ 404.950;R$ 472.066;R$ 442.674;R$ 654.218;0;0;0;0;0
IDB;TRAMONTINA MASTER;2026;R$ 127.259;R$ 75.579;R$ 102.215;R$ 87.216;R$ 124.075;R$ 122.164;R$ 133.972;0;0;0;0;0
IDB;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
ALMEIDA;GERAL;2026;R$ 1.733.000;R$ 1.046.000;R$ 2.719.149;R$ 1.462.373;R$ 1.410.144;R$ 2.329.420;R$ 2.464.212;0;0;0;0;0
ALMEIDA;TRAMONTINA MULTI;2026;R$ 1.514.000;R$ 896.000;R$ 2.292.149;R$ 1.201.110;R$ 1.229.813;R$ 1.746.000;R$ 2.192.000;0;0;0;0;0
ALMEIDA;TRAMONTINA MASTER;2026;R$ 219.000;R$ 150.000;R$ 427.000;R$ 261.263;R$ 180.331;R$ 583.420;R$ 272.212;0;0;0;0;0
ALMEIDA;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
DANTAS;GERAL;2026;R$ 210.095;R$ 148.331;R$ 433.028;R$ 291.791;R$ 451.407;R$ 462.329;R$ 268.551;0;0;0;0;0
DANTAS;TRAMONTINA MULTI;2026;R$ 159.072;R$ 118.091;R$ 386.629;R$ 223.791;R$ 403.170;R$ 309.950;R$ 217.377;0;0;0;0;0
DANTAS;TRAMONTINA MASTER;2026;R$ 51.023;R$ 30.240;R$ 46.399;R$ 68.000;R$ 48.237;R$ 152.379;R$ 51.174;0;0;0;0;0
DANTAS;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
MR;GERAL;2026;R$ 474.540;R$ 485.534;R$ 1.367.979;R$ 337.118;R$ 560.412;R$ 625.723;R$ 880.088;0;0;0;0;0
MR;TRAMONTINA MULTI;2026;R$ 384.942;R$ 434.998;R$ 1.290.306;R$ 260.807;R$ 474.085;R$ 520.728;R$ 738.176;0;0;0;0;0
MR;TRAMONTINA MASTER;2026;R$ 89.598;R$ 50.536;R$ 77.673;R$ 76.311;R$ 86.327;R$ 104.995;R$ 141.912;0;0;0;0;0
MR;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
LDF;GERAL;2026;R$ 778.428;R$ 693.024;R$ 959.233;R$ 842.744;R$ 760.669;R$ 548.228;R$ 1.003.179;0;0;0;0;0
LDF;TRAMONTINA MULTI;2026;R$ 714.735;R$ 616.840;R$ 833.602;R$ 756.677;R$ 597.114;R$ 443.271;R$ 874.744;0;0;0;0;0
LDF;TRAMONTINA MASTER;2026;R$ 63.693;R$ 76.184;R$ 125.631;R$ 86.067;R$ 163.555;R$ 104.957;R$ 128.435;0;0;0;0;0
LDF;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
AM;GERAL;2026;R$ 1.017.918;R$ 522.636;R$ 859.149;R$ 422.643;R$ 726.390;R$ 614.305;R$ 552.289;0;0;0;0;0
AM;TRAMONTINA MULTI;2026;R$ 866.696;R$ 379.632;R$ 537.522;R$ 322.843;R$ 505.549;R$ 426.301;R$ 374.359;0;0;0;0;0
AM;TRAMONTINA MASTER;2026;R$ 151.222;R$ 143.004;R$ 321.627;R$ 99.800;R$ 220.841;R$ 188.004;R$ 177.930;0;0;0;0;0
AM;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
ABREU;GERAL;2026;R$ 1.180.200;R$ 1.314.127;R$ 1.631.050;R$ 1.400.801;R$ 1.810.074;R$ 1.532.771;R$ 1.697.669;0;0;0;0;0
ABREU;TRAMONTINA MULTI;2026;R$ 864.204;R$ 1.039.783;R$ 1.276.426;R$ 1.092.236;R$ 1.491.000;R$ 991.673;R$ 1.214.000;0;0;0;0;0
ABREU;TRAMONTINA MASTER;2026;R$ 315.996;R$ 274.344;R$ 354.624;R$ 308.565;R$ 319.074;R$ 541.098;R$ 483.669;0;0;0;0;0
ABREU;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
TOLEDO;GERAL;2026;R$ 262.977;R$ 220.288;R$ 358.035;R$ 207.998;R$ 234.044;R$ 205.195;R$ 379.174;0;0;0;0;0
TOLEDO;TRAMONTINA MULTI;2026;R$ 208.716;R$ 186.035;R$ 304.351;R$ 174.493;R$ 181.408;R$ 157.523;R$ 307.768;0;0;0;0;0
TOLEDO;TRAMONTINA MASTER;2026;R$ 54.261;R$ 34.253;R$ 53.684;R$ 33.505;R$ 52.636;R$ 47.672;R$ 71.406;0;0;0;0;0
TOLEDO;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
MAIA;GERAL;2026;R$ 828.172;R$ 518.474;R$ 1.105.497;R$ 776.356;R$ 1.281.965;R$ 778.684;R$ 1.621.732;0;0;0;0;0
MAIA;TRAMONTINA MULTI;2026;R$ 577.273;R$ 322.057;R$ 837.047;R$ 515.281;R$ 960.986;R$ 486.019;R$ 1.124.245;0;0;0;0;0
MAIA;TRAMONTINA MASTER;2026;R$ 250.899;R$ 196.417;R$ 268.450;R$ 261.075;R$ 320.979;R$ 292.665;R$ 497.487;0;0;0;0;0
MAIA;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
NILO MAIA;GERAL;2026;R$ 1.232.331;R$ 1.190.136;R$ 1.615.706;R$ 1.273.376;R$ 2.100.792;R$ 1.551.000;R$ 1.294.126;0;0;0;0;0
NILO MAIA;TRAMONTINA MULTI;2026;R$ 895.834;R$ 908.452;R$ 1.137.937;R$ 910.971;R$ 1.651.587;R$ 1.551.000;R$ 971.460;0;0;0;0;0
NILO MAIA;TRAMONTINA MASTER;2026;R$ 336.497;R$ 281.684;R$ 477.769;R$ 362.405;R$ 449.205;0;R$ 322.666;0;0;0;0;0
NILO MAIA;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
RAMACON;GERAL;2026;R$ 142.947;R$ 130.104;R$ 83.181;R$ 126.519;R$ 246.635;R$ 119.316;R$ 206.936;0;0;0;0;0
RAMACON;TRAMONTINA MULTI;2026;R$ 98.445;R$ 91.683;R$ 56.786;R$ 97.000;R$ 196.762;R$ 92.471;R$ 159.742;0;0;0;0;0
RAMACON;TRAMONTINA MASTER;2026;R$ 44.502;R$ 38.421;R$ 26.395;R$ 29.519;R$ 49.873;R$ 26.845;R$ 47.194;0;0;0;0;0
RAMACON;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
DISTAC;GERAL;2026;R$ 1.183.750;R$ 657.290;R$ 811.302;R$ 777.739;R$ 1.093.806;R$ 763.078;R$ 1.030.216;0;0;0;0;0
DISTAC;TRAMONTINA MULTI;2026;R$ 737.703;R$ 329.294;R$ 419.775;R$ 431.211;R$ 746.827;R$ 403.701;R$ 568.721;0;0;0;0;0
DISTAC;TRAMONTINA MASTER;2026;R$ 446.047;R$ 327.996;R$ 391.527;R$ 346.528;R$ 346.979;R$ 359.377;R$ 461.495;0;0;0;0;0
DISTAC;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
LAMPADINHA;GERAL;2026;R$ 662.083;R$ 584.351;R$ 448.228;R$ 398.637;R$ 398.336;R$ 386.079;R$ 730.183;0;0;0;0;0
LAMPADINHA;TRAMONTINA MULTI;2026;R$ 529.874;R$ 455.940;R$ 315.214;R$ 260.247;R$ 265.483;R$ 234.847;R$ 543.165;0;0;0;0;0
LAMPADINHA;TRAMONTINA MASTER;2026;R$ 132.209;R$ 128.411;R$ 133.014;R$ 138.390;R$ 132.853;R$ 151.232;R$ 187.018;0;0;0;0;0
LAMPADINHA;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
JORGE BATISTA;GERAL;2026;R$ 62.869;R$ 75.667;R$ 42.341;R$ 37.320;R$ 40.054;R$ 45.835;R$ 102.375;0;0;0;0;0
JORGE BATISTA;TRAMONTINA MULTI;2026;0;0;0;0;0;0;0;0;0;0;0;0
JORGE BATISTA;TRAMONTINA MASTER;2026;0;0;0;0;0;0;0;0;0;0;0;0
JORGE BATISTA;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0`;

export function parseMonetaryValue(val: string | number | undefined): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  // Clean whitespace, non-breaking space, currency prefix
  const str = String(val)
    .trim()
    .replace(/[\s\u00A0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, '')
    .replace(/R\$/gi, '')
    .replace(/^"+|"+$/g, '');

  if (str === '' || str === '-' || str === '0' || str === '0,00' || str === '0.00') return 0;

  let cleaned = str;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // e.g. 1.542.067,50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // e.g. 1542067,50
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    // e.g. 1.542.067 or 1542.067
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      if (/\.\d{3}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function normalizeLineName(name: string): string {
  if (!name) return 'GERAL';
  const clean = name.trim().toUpperCase();
  if (clean.includes('MULTI')) return 'TRAMONTINA MULTI';
  if (clean.includes('MASTER')) return 'TRAMONTINA MASTER';
  if (clean.includes('PRO')) return 'TRAMONTINA PRO';
  if (clean.includes('GERAL') || clean.includes('TOTAL')) return 'GERAL';
  return clean;
}

const MONTH_HEADER_LOOKUP: Record<string, keyof SellOutRecord['meses']> = {
  'JANEIRO': 'janeiro', 'JAN': 'janeiro', '1': 'janeiro',
  'FEVEREIRO': 'fevereiro', 'FEV': 'fevereiro', '2': 'fevereiro',
  'MARÇO': 'marco', 'MARCO': 'marco', 'MAR': 'marco', '3': 'marco',
  'ABRIL': 'abril', 'ABR': 'abril', '4': 'abril',
  'MAIO': 'maio', 'MAI': 'maio', 'MAY': 'maio', '5': 'maio',
  'JUNHO': 'junho', 'JUN': 'junho', '6': 'junho',
  'JULHO': 'julho', 'JUL': 'julho', '7': 'julho',
  'AGOSTO': 'agosto', 'AGO': 'agosto', 'AUG': 'agosto', '8': 'agosto',
  'SETEMBRO': 'setembro', 'SET': 'setembro', 'SEP': 'setembro', '9': 'setembro',
  'OUTUBRO': 'outubro', 'OUT': 'outubro', 'OCT': 'outubro', '10': 'outubro',
  'NOVEMBRO': 'novembro', 'NOV': 'novembro', '11': 'novembro',
  'DEZEMBRO': 'dezembro', 'DEZ': 'dezembro', 'DEC': 'dezembro', '12': 'dezembro'
};

/**
 * Universal parser for Sell Out text pasted from Excel, Google Sheets, or CSV files.
 * Handles:
 * 1. Tab separated (TSV copied directly from Excel).
 * 2. Semicolon or comma separated CSVs.
 * 3. Merged cells in Excel where client names are on the first row and empty on subsequent rows.
 * 4. Flexible column orders with or without "NOME COORDENADOR".
 * 5. Automatic detection of years (2025, 2026).
 */
export function parseSellOutCSV(csvText: string): SellOutRecord[] {
  if (!csvText || !csvText.trim()) return [];

  // Normalize line endings
  const rawLines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) return [];

  // Detect delimiter: check tabs first (Excel default), then semicolons, then commas
  let delimiter = '\t';
  const sample = lines.slice(0, 5).join('\n');
  if (sample.includes('\t')) {
    delimiter = '\t';
  } else if (sample.includes(';')) {
    delimiter = ';';
  } else if (sample.includes(',')) {
    delimiter = ',';
  }

  // Helper to split a line safely
  const splitLine = (line: string): string[] => {
    return line.split(delimiter).map(col => {
      let c = col.trim();
      if (c.startsWith('"') && c.endsWith('"')) {
        c = c.substring(1, c.length - 1).trim();
      }
      return c;
    });
  };

  // Inspect first few lines for header detection
  let headerIndex = -1;
  let clientCol = -1;
  let coordCol = -1;
  let lineCol = -1;
  let yearCol = -1;
  const monthCols: Partial<Record<keyof SellOutRecord['meses'], number>> = {};

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = splitLine(lines[i]);
    const uppercaseCols = cols.map(c => c.toUpperCase());

    const hasClient = uppercaseCols.some(c => c.includes('CLIENTE') || c.includes('CLIENT'));
    const hasLine = uppercaseCols.some(c => c.includes('SELL OUT') || c.includes('LINHA') || c.includes('GRUPO'));
    const hasYear = uppercaseCols.some(c => c.includes('ANO') || c.includes('YEAR'));
    const hasMonths = uppercaseCols.some(c => c.includes('JAN') || c.includes('JANEIRO') || c.includes('DEZ'));

    if (hasClient || hasLine || hasYear || hasMonths) {
      headerIndex = i;
      uppercaseCols.forEach((colName, colIdx) => {
        if (colName.includes('CLIENTE') || colName.includes('CLIENT')) {
          clientCol = colIdx;
        } else if (colName.includes('COORDENADOR') || colName.includes('COORD')) {
          coordCol = colIdx;
        } else if (colName.includes('SELL OUT') || colName.includes('LINHA') || colName.includes('GRUPO')) {
          lineCol = colIdx;
        } else if (colName.includes('ANO') || colName.includes('YEAR')) {
          yearCol = colIdx;
        } else {
          // Check months
          for (const [pattern, key] of Object.entries(MONTH_HEADER_LOOKUP)) {
            if (colName === pattern || colName.startsWith(pattern) || colName.endsWith(pattern)) {
              monthCols[key] = colIdx;
              break;
            }
          }
        }
      });
      break;
    }
  }

  // If header was not explicitly found or missing columns, establish intelligent defaults
  if (clientCol === -1 && lineCol === -1 && yearCol === -1) {
    // Check first data row to determine column structure
    const firstCols = splitLine(lines[0]);
    if (firstCols.length >= 15) {
      // Check if col 1 is a line (GERAL / MULTI / MASTER / PRO) and col 2 is a year (2025/2026)
      const col1Norm = normalizeLineName(firstCols[1]);
      const isCol1Line = ['GERAL', 'TRAMONTINA MULTI', 'TRAMONTINA MASTER', 'TRAMONTINA PRO'].includes(col1Norm);
      const isCol2Year = /^202[4-9]$/.test(firstCols[2]);

      if (isCol1Line && isCol2Year) {
        clientCol = 0;
        lineCol = 1;
        yearCol = 2;
        coordCol = -1;
        MONTH_KEYS.forEach((m, idx) => {
          monthCols[m] = 3 + idx;
        });
      } else {
        // Assume format: CLIENTE; COORDENADOR; LINHA; ANO; JANEIRO..DEZEMBRO
        clientCol = 0;
        coordCol = 1;
        lineCol = 2;
        yearCol = 3;
        MONTH_KEYS.forEach((m, idx) => {
          monthCols[m] = 4 + idx;
        });
      }
    }
  } else {
    // If some columns were resolved from header, fill any missing month offsets
    if (clientCol === -1) clientCol = 0;
    if (lineCol === -1) lineCol = coordCol === 1 ? 2 : 1;
    if (yearCol === -1) yearCol = lineCol + 1;

    if (Object.keys(monthCols).length === 0) {
      const monthStart = Math.max(yearCol + 1, 3);
      MONTH_KEYS.forEach((m, idx) => {
        monthCols[m] = monthStart + idx;
      });
    }
  }

  const records: SellOutRecord[] = [];
  let currentClient = '';
  let currentCoordinator = 'Adriano Almeida';
  let currentYear = 2025;

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const cols = splitLine(rawLine);
    if (cols.length < 3) continue;

    // Check if line is a repeated header or summary
    const col0Upper = (cols[0] || '').toUpperCase();
    if (col0Upper.includes('CLIENTE') || col0Upper.includes('TOTAL GERAL') || col0Upper.includes('SOMA')) {
      continue;
    }

    // Extract raw client
    const rawClient = clientCol >= 0 && cols[clientCol] ? cols[clientCol].trim() : '';
    
    // Check if this cell is actually a client name or empty due to Excel merged cell
    const isLineName = ['GERAL', 'TRAMONTINA MULTI', 'TRAMONTINA MASTER', 'TRAMONTINA PRO', 'MULTI', 'MASTER', 'PRO'].includes(rawClient.toUpperCase());
    const isYear = /^202[4-9]$/.test(rawClient);

    if (rawClient && !isLineName && !isYear) {
      currentClient = rawClient;
    }

    if (!currentClient) {
      continue;
    }

    // Extract coordinator if available
    if (coordCol >= 0 && cols[coordCol] && cols[coordCol].trim()) {
      const val = cols[coordCol].trim();
      if (!val.toUpperCase().includes('COORDENADOR') && !isLineName && !isYear) {
        currentCoordinator = val;
      }
    }

    // Extract line name
    const rawLineName = lineCol >= 0 && cols[lineCol] ? cols[lineCol] : '';
    const linha = normalizeLineName(rawLineName);

    // Extract year
    let rowYear = currentYear;
    if (yearCol >= 0 && cols[yearCol]) {
      const parsedYear = parseInt(cols[yearCol].replace(/\D/g, ''));
      if (parsedYear >= 2020 && parsedYear <= 2035) {
        rowYear = parsedYear;
        currentYear = parsedYear;
      } else if (parsedYear === 25 || parsedYear === 26) {
        rowYear = 2000 + parsedYear;
        currentYear = rowYear;
      }
    }

    // Extract monthly values
    const meses = {
      janeiro: parseMonetaryValue(monthCols.janeiro !== undefined ? cols[monthCols.janeiro] : undefined),
      fevereiro: parseMonetaryValue(monthCols.fevereiro !== undefined ? cols[monthCols.fevereiro] : undefined),
      marco: parseMonetaryValue(monthCols.marco !== undefined ? cols[monthCols.marco] : undefined),
      abril: parseMonetaryValue(monthCols.abril !== undefined ? cols[monthCols.abril] : undefined),
      maio: parseMonetaryValue(monthCols.maio !== undefined ? cols[monthCols.maio] : undefined),
      junho: parseMonetaryValue(monthCols.junho !== undefined ? cols[monthCols.junho] : undefined),
      julho: parseMonetaryValue(monthCols.julho !== undefined ? cols[monthCols.julho] : undefined),
      agosto: parseMonetaryValue(monthCols.agosto !== undefined ? cols[monthCols.agosto] : undefined),
      setembro: parseMonetaryValue(monthCols.setembro !== undefined ? cols[monthCols.setembro] : undefined),
      outubro: parseMonetaryValue(monthCols.outubro !== undefined ? cols[monthCols.outubro] : undefined),
      novembro: parseMonetaryValue(monthCols.novembro !== undefined ? cols[monthCols.novembro] : undefined),
      dezembro: parseMonetaryValue(monthCols.dezembro !== undefined ? cols[monthCols.dezembro] : undefined)
    };

    records.push({
      id: `${currentClient}_${linha}_${rowYear}_${records.length}`,
      cliente: currentClient,
      coordenador: currentCoordinator,
      linha,
      ano: rowYear,
      meses
    });
  }

  return records;
}

/**
 * Parse an Excel workbook file (ArrayBuffer) directly into SellOutRecord array.
 */
export function parseSellOutExcel(buffer: ArrayBuffer): SellOutRecord[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];
    
    // Convert first sheet to CSV with tab delimiter
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
    return parseSellOutCSV(tsv);
  } catch (err) {
    console.error('Error reading Excel workbook:', err);
    throw new Error('Não foi possível ler o arquivo Excel.');
  }
}

const STORAGE_KEY_SELL_OUT = 'tramontina_sell_out_records_v2';

export function getStoredSellOutRecords(): SellOutRecord[] {
  if (typeof window === 'undefined') return parseSellOutCSV(INITIAL_SELL_OUT_CSV);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SELL_OUT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Also check old storage key v1 for backwards compatibility
    const oldRaw = localStorage.getItem('tramontina_sell_out_records_v1');
    if (oldRaw) {
      const parsedOld = JSON.parse(oldRaw);
      if (Array.isArray(parsedOld) && parsedOld.length > 0) {
        return parsedOld;
      }
    }
  } catch (e) {
    console.error('Error loading sell out records from localStorage', e);
  }

  const initial = parseSellOutCSV(INITIAL_SELL_OUT_CSV);
  try {
    localStorage.setItem(STORAGE_KEY_SELL_OUT, JSON.stringify(initial));
  } catch (e) {
    console.error('Error saving initial sell out to localStorage', e);
  }
  return initial;
}

export function saveStoredSellOutRecords(records: SellOutRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SELL_OUT, JSON.stringify(records));
    // Also update v1 key for safety
    localStorage.setItem('tramontina_sell_out_records_v1', JSON.stringify(records));
  } catch (e) {
    console.error('Error saving sell out records to localStorage', e);
  }
}
